package handler

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type TTSHandler struct {
	ttsService *service.TTSService
	audioRepo  *repository.AudioRepository
}

func NewTTSHandler(ttsService *service.TTSService, audioRepo *repository.AudioRepository) *TTSHandler {
	return &TTSHandler{ttsService: ttsService, audioRepo: audioRepo}
}

// @Summary TTS cache stats
// @Description Get count of cached audio entries.
// @Tags TTS
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /tts/cache/stats [get]
func (h *TTSHandler) GetCacheStats(c *fiber.Ctx) error {
	cached, err := h.audioRepo.GetCacheStats(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", "failed to read cache stats")
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"total_cached": cached,
	})
}

// @Summary TTS metrics
// @Description Get audio cache totals and metrics.
// @Tags TTS
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /tts/metrics [get]
func (h *TTSHandler) GetMetrics(c *fiber.Ctx) error {
	cached, err := h.audioRepo.GetCacheStats(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", "failed to read cache stats")
	}
	total, err := h.audioRepo.GetTotalAudioCount(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", "failed to read audio count")
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"total_cached":   cached,
		"total_audio":    total,
		"cache_hit_rate": 0.0,
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
	})
}

// @Summary Synthesize speech (TTS)
// @Description Generate audio for a text via TTS engine (edge/google/azure). Cached by text+locale+gender hash.
// @Tags TTS
// @Accept json
// @Produce json
// @Param body body models.TTSRequest true "Text to synthesize"
// @Success 200 {object} response.APIResponse{data=models.AudioRecord}
// @Failure 400 {object} response.APIError "INVALID_BODY / INVALID_JSON / MISSING_TEXT"
// @Failure 500 {object} response.APIError "TTS_FAILED"
// @Router /tts [post]
func (h *TTSHandler) Synthesize(c *fiber.Ctx) error {
	body := c.Body()
	if len(body) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "request body is required")
	}

	var req models.TTSRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_JSON", "invalid JSON body")
	}

	if req.Text == "" {
		return response.Error(c, fiber.StatusBadRequest, "MISSING_TEXT", "text is required")
	}
	// Cap text length: a single synthesis hits paid providers (Google/Azure);
	// an unbounded body turns the 10/min rate limit into a cost amplification
	// vector. ~4k chars is generous for any real learning sentence.
	if len(req.Text) > 4096 {
		return response.Error(c, fiber.StatusBadRequest, "TEXT_TOO_LONG", "text exceeds the 4096 character limit")
	}
	if req.Locale == "" {
		req.Locale = "zh-CN"
	}
	if req.Gender == "" {
		req.Gender = "female"
	}

	record, cacheHit, err := h.ttsService.Synthesize(c.Context(), req.Text, req.Locale, req.Gender)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "TTS_FAILED", err.Error())
	}

	cacheHeader := "miss"
	if cacheHit {
		cacheHeader = "hit"
	}
	c.Set("X-TTS-Cache", cacheHeader)
	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"url":      record.URL,
		"text":     record.Text,
		"locale":   record.Locale,
		"gender":   record.Gender,
		"provider": record.Provider,
	})
}
