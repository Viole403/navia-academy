package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

var (
	ErrContentNotFound  = errors.New("content item not found")
	ErrContentStale     = errors.New("content item changed since last read")
	ErrContentLocked    = errors.New("item is under review and locked for edits")
	ErrContentForbidden = errors.New("you are not the owner of this item")
	ErrDuplicateID      = errors.New("duplicate-id")
	ErrInvalidReview    = errors.New("status must be published or rejected")
	ErrInvalidLang      = errors.New("invalid lang: must be one of zh, de, en, ja")
	ErrInvalidDomain    = errors.New("invalid domain: must be vocabulary, grammar, readings, conversations or characters")
	ErrMissingRef       = errors.New("ref is required to publish: assign a level (e.g. hsk/hsk3)")
	ErrInvalidRef       = errors.New("invalid ref for this lang/domain")
)

type ContentService struct {
	contentRepo *repository.ContentRepository
}

func NewContentService(contentRepo *repository.ContentRepository) *ContentService {
	return &ContentService{contentRepo: contentRepo}
}

func (s *ContentService) List(ctx context.Context, req models.ContentListRequest, userID, role string) ([]models.ContentItem, error) {
	status := req.Status
	if status == "" {
		status = "draft"
	}
	if status != "all" {
		return s.contentRepo.List(ctx, req.Lang, req.Domain, status, req.Limit, req.Offset)
	}
	// "all" = no status filter. Repo supports empty status → no filter.
	return s.contentRepo.List(ctx, req.Lang, req.Domain, "", req.Limit, req.Offset)
}

func (s *ContentService) Get(ctx context.Context, lang, domain, id string) (*models.ContentItem, error) {
	item, err := s.contentRepo.Get(ctx, lang, domain, id)
	if err != nil {
		return nil, ErrContentNotFound
	}
	return item, nil
}

// contentLangs / contentDomains whitelist the write path to match
// apps/media/data/json on disk. Content uploaded outside these sets would
// never reach the CDN bundles.
var (
	contentLangs   = map[string]bool{"zh": true, "de": true, "en": true, "ja": true}
	contentDomains = map[string]bool{
		"vocabulary": true, "grammar": true, "readings": true,
		"conversations": true, "characters": true,
	}
)

// The ref whitelist (allowedRefs) is NOT hardcoded here anymore — it is
// published by apps/media to data/content-levels.json on the CDN, fetched at
// startup + refreshed periodically (see content_levels.go / main.go).

// validatePayload normalizes a content payload against the canonical JSON
// schema in apps/media/data/json (apps/media/scripts/generate-manifest.ts).
// It force-sets the row identity (id, language) and rejects payloads missing
// required fields, so contributor items never diverge from the published format.
// `ref` is the effective level assignment ("hsk/hsk3", "tocfl/tocfl-l1", …) —
// it may be empty pre-review; only tocfl-assigned zh vocab requires zhuyin.
func validatePayload(lang, domain, id, ref string, raw json.RawMessage) (json.RawMessage, error) {
	if !contentLangs[lang] {
		return nil, errors.New("invalid lang: must be one of zh, de, en, ja")
	}
	if !contentDomains[domain] {
		return nil, errors.New("invalid domain: must be vocabulary, grammar, readings, conversations or characters")
	}

	var p map[string]interface{}
	if err := json.Unmarshal(raw, &p); err != nil || p == nil {
		return nil, errors.New("payload must be a JSON object")
	}

	// Canonical identity: mirror the row key, never trust the client to set it.
	p["language"] = lang
	p["id"] = id

	var missing []string
	need := func(keys ...string) {
		for _, k := range keys {
			if v, ok := p[k]; !ok || v == nil || v == "" {
				missing = append(missing, k)
			}
		}
	}
	hasVal := func(k string) bool {
		v, ok := p[k]
		return ok && v != nil && v != ""
	}
	hasList := func(k string) bool {
		v, ok := p[k].([]interface{})
		return ok && len(v) > 0
	}

	switch domain {
	case "vocabulary":
		need("text", "translation")
		if lang == "zh" {
			// HSK 3.0 syllabus carries pinyin at every level → hanzi+pinyin are
			// required for ALL zh vocabulary (hsk and tocfl alike; the hsk5-7
			// seed gap is a known data issue, not the rule).
			need("hanzi", "pinyin")
			// Zhuyin/bopomofo is a TOCFL (Taiwan) convention, not part of HSK:
			// only enforced once a tocfl ref is actually assigned. Empty ref
			// (pre-review) or hsk/* → not required.
			if strings.HasPrefix(ref, "tocfl/") {
				need("zhuyin")
			}
		}
		if lang == "ja" {
			if !hasVal("hiragana") && !hasVal("kanji") {
				missing = append(missing, "hiragana or kanji")
			}
			need("romanization")
		}
	case "characters":
		need("char", "meaning")
		if lang == "zh" {
			need("pinyin", "zhuyin")
		}
	case "grammar":
		need("title", "pattern", "simpleExplanation")
	case "readings":
		need("title", "summary")
		if !hasList("paragraphs") {
			missing = append(missing, "paragraphs")
		}
	case "conversations":
		need("title")
		if lang == "zh" {
			if !hasList("turns") {
				missing = append(missing, "turns")
			}
		} else if !hasList("dialogue") {
			missing = append(missing, "dialogue")
		}
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("payload missing required field(s): %s", strings.Join(missing, ", "))
	}

	norm, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return norm, nil
}

func (s *ContentService) Create(ctx context.Context, req models.CreateContentRequest, userID string) (*models.ContentItem, error) {
	req.Lang = strings.TrimSpace(req.Lang)
	req.Domain = strings.TrimSpace(req.Domain)
	req.ID = strings.TrimSpace(req.ID)
	if req.Lang == "" || req.Domain == "" || req.ID == "" {
		return nil, errors.New("lang, domain and id are required")
	}

	// Contributor-proposed level is advisory: optional, but if given it must
	// be a legitimate target file for this lang+domain.
	if req.Ref != "" && !IsValidRef(req.Lang, req.Domain, req.Ref) {
		return nil, ErrInvalidRef
	}

	payload, err := validatePayload(req.Lang, req.Domain, req.ID, req.Ref, req.Payload)
	if err != nil {
		return nil, err
	}
	req.Payload = payload

	item := &models.ContentItem{
		ID:        req.ID,
		Lang:      req.Lang,
		Domain:    req.Domain,
		Ref:       req.Ref,
		Pos:       req.Pos,
		Kind:      req.Kind,
		Payload:   req.Payload,
		Status:    "draft",
		CreatedBy: userID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if item.Kind == "" {
		item.Kind = "object"
	}
	if item.Payload == nil {
		item.Payload = json.RawMessage("{}")
	}

	if err := s.contentRepo.Create(ctx, item); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrDuplicateID
		}
		return nil, err
	}
	return item, nil
}

func (s *ContentService) Update(ctx context.Context, lang, domain, id, userID, role string, req models.UpdateContentRequest) (*models.ContentItem, error) {
	item, err := s.contentRepo.Get(ctx, lang, domain, id)
	if err != nil {
		return nil, ErrContentNotFound
	}

	// Owner check: creator or reviewer (admin) may update. Reviewers can only
	// change status; contributors can edit content of their own drafts.
	if role != "admin" && item.CreatedBy != userID {
		return nil, ErrContentForbidden
	}

	// Items under review are locked for edits (only a reviewer may change status).
	if item.Status == "review" && req.Payload != nil {
		return nil, ErrContentLocked
	}

	// Optimistic lock: client must send expected_updated_at matching the row.
	if req.ExpectedUpdatedAt != nil && *req.ExpectedUpdatedAt != "" {
		exp, err := time.Parse(time.RFC3339Nano, *req.ExpectedUpdatedAt)
		if err != nil {
			exp, err = time.Parse(time.RFC3339, *req.ExpectedUpdatedAt)
		}
		if err == nil && !exp.Equal(item.UpdatedAt) {
			return nil, ErrContentStale
		}
	}

	// Contributor may revise their proposed level while the item is editable.
	effectiveRef := item.Ref
	if req.Ref != nil {
		trimmed := strings.TrimSpace(*req.Ref)
		if trimmed != "" && !IsValidRef(lang, domain, trimmed) {
			return nil, ErrInvalidRef
		}
		item.Ref = trimmed
		effectiveRef = trimmed
	}

	if req.Payload != nil {
		norm, err := validatePayload(lang, domain, id, effectiveRef, *req.Payload)
		if err != nil {
			return nil, err
		}
		item.Payload = norm
	}
	if req.Status != nil {
		item.Status = *req.Status
	}

	if err := s.contentRepo.Update(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

// Review publishes or rejects an item. Publishing REQUIRES a valid ref for
// the row's lang+domain — the reviewer/admin assignment is authoritative and
// overwrites any contributor proposal. Rejecting leaves ref untouched (the
// proposal survives for a future resubmission).
func (s *ContentService) Review(ctx context.Context, lang, domain, id, status, reviewerID, note, ref string) (*models.ContentItem, error) {
	if status != "published" && status != "rejected" {
		return nil, ErrInvalidReview
	}

	var refPtr *string
	if status == "published" {
		trimmed := strings.TrimSpace(ref)
		if trimmed == "" {
			return nil, ErrMissingRef
		}
		if !IsValidRef(lang, domain, trimmed) {
			return nil, ErrInvalidRef
		}
		refPtr = &trimmed
	}

	item, err := s.contentRepo.Get(ctx, lang, domain, id)
	if err != nil {
		return nil, ErrContentNotFound
	}
	if item.Status != "review" {
		// Allow re-review of rejected/draft items only via explicit status change;
		// publishing requires the item to have been submitted for review.
		if status == "published" && item.Status != "rejected" {
			return nil, errors.New("item must be submitted for review before publishing")
		}
	}

	var notePtr *string
	if strings.TrimSpace(note) != "" {
		n := strings.TrimSpace(note)
		notePtr = &n
	}

	if err := s.contentRepo.Review(ctx, lang, domain, id, status, reviewerID, notePtr, refPtr); err != nil {
		return nil, err
	}
	return s.contentRepo.Get(ctx, lang, domain, id)
}

func isUniqueViolation(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate"))
}

// Export returns published rows projected for the machine-to-machine export
// endpoint (apps/media sync bridge). Thin passthrough + filter validation —
// payloads need no transformation because validatePayload already normalizes
// them into data/json entry shape on write.
func (s *ContentService) Export(ctx context.Context, lang, domain string, since *time.Time, limit, offset int) ([]models.ExportContentItem, int64, error) {
	if lang != "" && !contentLangs[lang] {
		return nil, 0, ErrInvalidLang
	}
	if domain != "" && !contentDomains[domain] {
		return nil, 0, ErrInvalidDomain
	}

	items, err := s.contentRepo.ListPublished(ctx, lang, domain, since, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.contentRepo.CountPublished(ctx, lang, domain)
	if err != nil {
		return nil, 0, err
	}

	out := make([]models.ExportContentItem, 0, len(items))
	for _, it := range items {
		out = append(out, models.ExportContentItem{
			ID:        it.ID,
			Lang:      it.Lang,
			Domain:    it.Domain,
			Ref:       it.Ref,
			Pos:       it.Pos,
			Payload:   it.Payload,
			UpdatedAt: it.UpdatedAt,
		})
	}
	return out, total, nil
}
