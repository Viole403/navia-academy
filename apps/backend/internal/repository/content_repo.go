package repository

import (
	"context"
	"strconv"
	"time"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type ContentRepository struct {
	pool database.DBPool
}

func NewContentRepository(pool database.DBPool) *ContentRepository {
	return &ContentRepository{pool: pool}
}

func (r *ContentRepository) List(ctx context.Context, lang, domain, status string, limit, offset int) ([]models.ContentItem, error) {
	query := `SELECT id, lang, domain, ref, pos, kind, payload, status, created_by,
	                 reviewer_id, reviewed_at, review_note, created_at, updated_at
	          FROM content_items WHERE 1=1`
	args := []interface{}{}
	idx := 1
	if lang != "" {
		query += ` AND lang = $` + strconv.Itoa(idx)
		args = append(args, lang)
		idx++
	}
	if domain != "" {
		query += ` AND domain = $` + strconv.Itoa(idx)
		args = append(args, domain)
		idx++
	}
	if status != "" {
		query += ` AND status = $` + strconv.Itoa(idx)
		args = append(args, status)
		idx++
	}
	query += ` ORDER BY updated_at DESC LIMIT $` + strconv.Itoa(idx) + ` OFFSET $` + strconv.Itoa(idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.ContentItem
	for rows.Next() {
		var it models.ContentItem
		if err := rows.Scan(&it.ID, &it.Lang, &it.Domain, &it.Ref, &it.Pos, &it.Kind, &it.Payload,
			&it.Status, &it.CreatedBy, &it.ReviewerID, &it.ReviewedAt, &it.ReviewNote,
			&it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

func (r *ContentRepository) Get(ctx context.Context, lang, domain, id string) (*models.ContentItem, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, lang, domain, ref, pos, kind, payload, status, created_by,
		       reviewer_id, reviewed_at, review_note, created_at, updated_at
		FROM content_items WHERE lang=$1 AND domain=$2 AND id=$3
	`, lang, domain, id)

	it := &models.ContentItem{}
	err := row.Scan(&it.ID, &it.Lang, &it.Domain, &it.Ref, &it.Pos, &it.Kind, &it.Payload,
		&it.Status, &it.CreatedBy, &it.ReviewerID, &it.ReviewedAt, &it.ReviewNote,
		&it.CreatedAt, &it.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return it, nil
}

func (r *ContentRepository) GetMeta(ctx context.Context, lang, domain, id string) (*struct {
	UpdatedAt time.Time
	Status    string
	CreatedBy string
}, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT updated_at, status, created_by FROM content_items WHERE lang=$1 AND domain=$2 AND id=$3
	`, lang, domain, id)
	m := &struct {
		UpdatedAt time.Time
		Status    string
		CreatedBy string
	}{}
	err := row.Scan(&m.UpdatedAt, &m.Status, &m.CreatedBy)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *ContentRepository) Create(ctx context.Context, it *models.ContentItem) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO content_items (id, lang, domain, ref, pos, kind, payload, status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, it.ID, it.Lang, it.Domain, it.Ref, it.Pos, it.Kind, it.Payload, it.Status, it.CreatedBy)
	return err
}

func (r *ContentRepository) Update(ctx context.Context, it *models.ContentItem) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE content_items SET payload=$1, status=$2, updated_at=NOW()
		WHERE lang=$3 AND domain=$4 AND id=$5
	`, it.Payload, it.Status, it.Lang, it.Domain, it.ID)
	return err
}

func (r *ContentRepository) Review(ctx context.Context, lang, domain, id, status string, reviewerID string, note *string, ref *string) error {
	// ref: reviewer-assigned target level on publish (COALESCE keeps any
	// existing proposal when rejecting, where ref is not provided).
	_, err := r.pool.Exec(ctx, `
		UPDATE content_items SET status=$1, reviewer_id=$2, reviewed_at=NOW(), review_note=$3,
		       ref=COALESCE($4, ref), updated_at=NOW()
		WHERE lang=$5 AND domain=$6 AND id=$7
	`, status, reviewerID, note, ref, lang, domain, id)
	return err
}

// ListPublished returns published rows for the machine-to-machine export
// endpoint (apps/media sync). Deterministic ordering keeps paged fetches
// stable; uses the existing idx_content_status index.
func (r *ContentRepository) ListPublished(ctx context.Context, lang, domain string, since *time.Time, limit, offset int) ([]models.ContentItem, error) {
	query := `SELECT id, lang, domain, ref, pos, kind, payload, status, created_by,
	                 reviewer_id, reviewed_at, review_note, created_at, updated_at
	          FROM content_items WHERE status = 'published'`
	args := []interface{}{}
	idx := 1
	if lang != "" {
		query += ` AND lang = $` + strconv.Itoa(idx)
		args = append(args, lang)
		idx++
	}
	if domain != "" {
		query += ` AND domain = $` + strconv.Itoa(idx)
		args = append(args, domain)
		idx++
	}
	if since != nil {
		query += ` AND updated_at > $` + strconv.Itoa(idx)
		args = append(args, *since)
		idx++
	}
	query += ` ORDER BY lang ASC, domain ASC, ref ASC, pos ASC, id ASC
	           LIMIT $` + strconv.Itoa(idx) + ` OFFSET $` + strconv.Itoa(idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.ContentItem
	for rows.Next() {
		var it models.ContentItem
		if err := rows.Scan(&it.ID, &it.Lang, &it.Domain, &it.Ref, &it.Pos, &it.Kind, &it.Payload,
			&it.Status, &it.CreatedBy, &it.ReviewerID, &it.ReviewedAt, &it.ReviewNote,
			&it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

// CountPublished returns how many published rows match the optional filters —
// feeds meta.total_published in the export envelope.
func (r *ContentRepository) CountPublished(ctx context.Context, lang, domain string) (int64, error) {
	query := `SELECT COUNT(*) FROM content_items WHERE status = 'published'`
	args := []interface{}{}
	if lang != "" {
		query += ` AND lang = $1`
		args = append(args, lang)
	}
	if domain != "" {
		query += ` AND domain = $` + strconv.Itoa(len(args)+1)
		args = append(args, domain)
	}
	var n int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&n)
	return n, err
}


