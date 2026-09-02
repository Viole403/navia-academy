package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/config"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type SupporterHandler struct {
	supporterService *service.SupporterService
	webhook          config.WebhookConfig
	siteURL          string
}

func NewSupporterHandler(supporterService *service.SupporterService, webhook config.WebhookConfig, siteURL string) *SupporterHandler {
	return &SupporterHandler{supporterService: supporterService, webhook: webhook, siteURL: siteURL}
}

type kofiWebhookPayload struct {
	VerificationToken string `json:"verification_token"`
	MessageID         string `json:"message_id"`
	Type              string `json:"type"`
	IsPublic          bool   `json:"is_public"`
	FromName          string `json:"from_name"`
	Message           string `json:"message"`
	Amount            string `json:"amount"`
	TransactionID     string `json:"kofi_transaction_id"`
	Timestamp         string `json:"timestamp"`
}

type trakteerWebhookPayload struct {
	ID           string          `json:"id"`
	Type         string          `json:"type"`
	SupporterName string         `json:"supporter_name"`
	SupporterMessage string      `json:"supporter_message"`
	Message      string          `json:"message"`
	AmountText   string          `json:"amount_text"`
	Amount       json.RawMessage `json:"amount"`
	Unit         string          `json:"unit"`
	Avatar       string          `json:"supporter_avatar"`
	IsAnonymous  bool            `json:"is_anonymous"`
	CreatedAt    string          `json:"created_at"`
}

// @Summary Ko-fi donation webhook
// @Description Receive Ko-fi donation events (form-urlencoded `data` field). Verifies verification_token, upserts supporter by transaction id.
// @Tags Supporters
// @Accept application/x-www-form-urlencoded
// @Produce json
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "INVALID_TOKEN"
// @Failure 500 {object} response.APIError "PROCESS_FAILED"
// @Router /webhooks/kofi [post]
func (h *SupporterHandler) KofiWebhook(c *fiber.Ctx) error {
	raw := c.FormValue("data")
	if raw == "" {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "missing data field")
	}
	var p kofiWebhookPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "invalid payload")
	}
	if h.webhook.KofiVerificationToken == "" || p.VerificationToken != h.webhook.KofiVerificationToken {
		return response.Error(c, http.StatusUnauthorized, "INVALID_TOKEN", "invalid verification token")
	}
	externalID := p.TransactionID
	if externalID == "" {
		externalID = p.MessageID
	}
	if externalID == "" {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "missing transaction id")
	}
	donatedAt := time.Now()
	if ts, err := time.Parse(time.RFC3339, p.Timestamp); err == nil {
		donatedAt = ts
	}
	s := &models.Supporter{
		Name:       strings.TrimSpace(p.FromName),
		Platform:   "kofi",
		Message:    optionalString(p.Message),
		IsPublic:   p.IsPublic && strings.TrimSpace(p.FromName) != "",
		ExternalID: "kofi:" + externalID,
		DonatedAt:  donatedAt,
		Currency:   "USD",
	}
	if amt, err := parseAmountMinor(p.Amount, "kofi"); err == nil {
		s.AmountMinor = &amt
	}
	if err := h.supporterService.Upsert(c.Context(), s); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "PROCESS_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Trakteer donation webhook
// @Description Receive Trakteer donation events (JSON). Verifies X-Trakteer-Signature (HMAC-SHA256 of raw body with secret), upserts supporter by transaction id.
// @Tags Supporters
// @Accept application/json
// @Produce json
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "INVALID_SIGNATURE"
// @Failure 500 {object} response.APIError "PROCESS_FAILED"
// @Router /webhooks/trakteer [post]
func (h *SupporterHandler) TrakteerWebhook(c *fiber.Ctx) error {
	body := c.Body()
	if len(body) == 0 {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "empty body")
	}
	if h.webhook.TrakteerWebhookSecret == "" {
		return response.Error(c, fiber.StatusInternalServerError, "NOT_CONFIGURED", "webhook secret not configured")
	}
	sig := c.Get("X-Trakteer-Signature")
	if !verifyHMAC(sig, body, h.webhook.TrakteerWebhookSecret) {
		return response.Error(c, http.StatusUnauthorized, "INVALID_SIGNATURE", "invalid signature")
	}
	var p trakteerWebhookPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "invalid payload")
	}
	if p.ID == "" {
		return response.Error(c, http.StatusBadRequest, "BAD_REQUEST", "missing transaction id")
	}
	name := strings.TrimSpace(p.SupporterName)
	message := strings.TrimSpace(p.SupporterMessage)
	if message == "" {
		message = strings.TrimSpace(p.Message)
	}
	donatedAt := time.Now()
	if ts, err := time.Parse(time.RFC3339, p.CreatedAt); err == nil {
		donatedAt = ts
	}
	s := &models.Supporter{
		Name:       name,
		AvatarURL:  optionalString(p.Avatar),
		Platform:   "trakteer",
		Message:    optionalString(message),
		IsPublic:   !p.IsAnonymous && name != "",
		ExternalID: "trakteer:" + p.ID,
		DonatedAt:  donatedAt,
		Currency:   "IDR",
	}
	if amt, err := parseAmountMinor(string(p.Amount), "trakteer"); err == nil {
		s.AmountMinor = &amt
	} else if amt, err := parseAmountMinor(p.AmountText, "trakteer"); err == nil {
		s.AmountMinor = &amt
	}
	if err := h.supporterService.Upsert(c.Context(), s); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "PROCESS_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary List supporters
// @Description Get public supporters (wall). Amount is never exposed.
// @Tags Supporters
// @Produce json
// @Param limit query int false "Max results (default 50, max 100)" example(50)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} response.APIResponse{data=[]models.PublicSupporter}
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /supporters [get]
func (h *SupporterHandler) GetSupporters(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit > 100 {
		limit = 100
	}
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	supporters, err := h.supporterService.ListPublic(c.Context(), limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, supporters)
}

func verifyHMAC(signature string, body []byte, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.TrimSpace(signature)), []byte(expected))
}

// parseAmountMinor converts a donation amount string to integer minor units
// for the given platform. The returned value is the smallest currency unit:
//   - kofi (USD): amount in dollars → cents (×100, round)
//   - trakteer (IDR): amount in whole rupiah → rupiah (×1, round)
func parseAmountMinor(raw string, platform string) (int64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, errors.New("empty amount")
	}
	clean := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' || r == '.' {
			return r
		}
		if r == ',' {
			return '.'
		}
		return -1
	}, raw)
	if clean == "" || clean == "." {
		return 0, errors.New("no digits in amount")
	}
	// Reject absurd input early (e.g. hundreds of digits): ParseFloat would
	// return +Inf, which then fails to marshal to JSON / store in DB.
	if len(clean) > 32 {
		return 0, errors.New("amount too long")
	}
	amt, err := strconv.ParseFloat(clean, 64)
	if err != nil || math.IsInf(amt, 0) || math.IsNaN(amt) {
		return 0, errors.New("invalid amount")
	}

	switch platform {
	case "kofi":
		// Ko-fi sends amounts in USD with decimal (e.g. "5.00").
		return int64(math.Round(amt * 100)), nil
	default:
		// Trakteer sends amounts in whole IDR (e.g. "50000" → Rp 50,000).
		return int64(math.Round(amt)), nil
	}
}

func optionalString(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	v := s
	return &v
}

// @Summary Webhook config status
// @Description Admin: donation webhook endpoints + whether secrets are configured. Never returns the secrets themselves.
// @Tags Supporters
// @Produce json
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 403 {object} response.APIError "FORBIDDEN"
// @Router /admin/support/config [get]
func (h *SupporterHandler) GetWebhookConfig(c *fiber.Ctx) error {
	base := h.siteURL
	if base == "" {
		base = "http://localhost:8080"
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"kofi": fiber.Map{
			"endpoint":    base + "/api/v1/webhooks/kofi",
			"configured":  h.webhook.KofiVerificationToken != "",
			"instructions": "Paste endpoint ini di Ko-fi → Donation Settings → Webhook. verification_token di payload harus sama dengan KOFI_VERIFICATION_TOKEN di env backend.",
		},
		"trakteer": fiber.Map{
			"endpoint":    base + "/api/v1/webhooks/trakteer",
			"configured":  h.webhook.TrakteerWebhookSecret != "",
			"instructions": "Paste endpoint ini di Trakteer → Webhook. Header X-Trakteer-Signature (HMAC-SHA256 body dengan secret) harus cocok dengan TRAKTEER_WEBHOOK_SECRET di env backend.",
		},
	})
}

// @Summary List all supporters
// @Description Admin: full supporter list including hidden/private ones and amounts.
// @Tags Supporters
// @Produce json
// @Param limit query int false "Max results (default 100, max 200)" example(100)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} response.APIResponse{data=[]models.Supporter}
// @Failure 403 {object} response.APIError "FORBIDDEN"
// @Router /admin/supporters [get]
func (h *SupporterHandler) ListAllSupporters(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	supporters, err := h.supporterService.ListAll(c.Context(), limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, supporters)
}
