package handler

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

// ResonanceHandler exposes emotional resonance over word origins.
// Violet = all-time total, turquoise = 24h live pulse.
type ResonanceHandler struct {
	resonanceService *service.ResonanceService
}

func NewResonanceHandler(resonanceService *service.ResonanceService) *ResonanceHandler {
	return &ResonanceHandler{resonanceService: resonanceService}
}

// @Summary Record a resonance reaction
// @Description Attach a feeling (inspired, warm, curious, nostalgic, calm, excited) to a word origin. Aliases are normalized.
// @Tags Resonance
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.ResonanceEvent true "Resonance event"
// @Success 201 {object} response.APIResponse{data=models.ResonanceOrigin}
// @Failure 400 {object} response.APIError "INVALID_ORIGIN / INVALID_EMOTION / MISSING_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED"
// @Failure 500 {object} response.APIError "SAVE_FAILED"
// @Router /resonance [post]
func (h *ResonanceHandler) Add(c *fiber.Ctx) error {
	var e models.ResonanceEvent
	if err := c.BodyParser(&e); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "MISSING_BODY", "invalid resonance payload")
	}
	userID := c.Locals("user_id").(string)
	aggregated, err := h.resonanceService.Add(c.Context(), e, userID)
	if err != nil {
		return resonanceServiceError(c, err)
	}
	return response.JSON(c, fiber.StatusCreated, aggregated)
}

// @Summary Get an origin's resonance
// @Description Public. Returns all-time (violet) and 24h live (turquoise) emotion counts for one origin.
// @Tags Resonance
// @Produce json
// @Param origin query string true "Origin key (radical / head character)"
// @Success 200 {object} response.APIResponse{data=models.ResonanceOrigin}
// @Failure 400 {object} response.APIError "INVALID_ORIGIN"
// @Router /resonance [get]
func (h *ResonanceHandler) Get(c *fiber.Ctx) error {
	origin := strings.TrimSpace(c.Query("origin"))
	aggregated, err := h.resonanceService.Get(c.Context(), origin)
	if err != nil {
		return resonanceServiceError(c, err)
	}
	return response.JSON(c, fiber.StatusOK, aggregated)
}

// @Summary Hot origins right now
// @Description Public. Top origins ranked by 24h live pulse (turquoise), with all-time totals (violet).
// @Tags Resonance
// @Produce json
// @Param limit query int false "Max rows (default 8, max 25)"
// @Success 200 {object} response.APIResponse{data=[]models.ResonanceHot}
// @Router /resonance/hot [get]
func (h *ResonanceHandler) Hot(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 8)
	hot, err := h.resonanceService.Hot(c.Context(), limit)
	if err != nil {
		return resonanceServiceError(c, err)
	}
	return response.JSON(c, fiber.StatusOK, hot)
}

// @Summary My resonance reactions
// @Description Auth. The caller's recent reactions, for re-highlighting the UI.
// @Tags Resonance
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.ResonanceReaction}
// @Failure 401 {object} response.APIError "UNAUTHORIZED"
// @Router /resonance/me [get]
func (h *ResonanceHandler) MyReactions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	reactions, err := h.resonanceService.MyReactions(c.Context(), userID, 20)
	if err != nil {
		return resonanceServiceError(c, err)
	}
	return response.JSON(c, fiber.StatusOK, reactions)
}

func resonanceServiceError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, service.ErrResonanceInvalidOrigin):
		return response.Error(c, fiber.StatusBadRequest, "INVALID_ORIGIN", err.Error())
	case errors.Is(err, service.ErrResonanceInvalidEmotion):
		return response.Error(c, fiber.StatusBadRequest, "INVALID_EMOTION", err.Error())
	default:
		return response.Error(c, fiber.StatusInternalServerError, "SAVE_FAILED", "failed to save resonance")
	}
}