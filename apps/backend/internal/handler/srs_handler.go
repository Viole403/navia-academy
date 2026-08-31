package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type SRSHandler struct {
	srsService *service.SRSReviewService
}

func NewSRSHandler(srsService *service.SRSReviewService) *SRSHandler {
	return &SRSHandler{srsService: srsService}
}

// @Summary Get due SRS cards
// @Description Get the user's SRS cards due for review (limit 200 max).
// @Tags SRS
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Max cards (default 50, max 200)" example(50)
// @Success 200 {object} response.APIResponse{data=[]models.SrsCard}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress/due-cards [get]
func (h *SRSHandler) GetDueCards(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	cards, err := h.srsService.GetDueCards(c.Context(), userID, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, cards)
}

// @Summary Review SRS card
// @Description Grade a card (0–3) and apply SM-2 style scheduling.
// @Tags SRS
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.SRSReviewRequest true "Card + grade"
// @Success 200 {object} response.APIResponse{data=models.SrsCard}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "REVIEW_FAILED"
// @Router /progress/review [post]
func (h *SRSHandler) ReviewCard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.SRSReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	card, err := h.srsService.ReviewCard(c.Context(), userID, req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "REVIEW_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, card)
}

// @Summary Create SRS card
// @Description Create a new SRS card for an item (no-op if it already exists).
// @Tags SRS
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"item_id\":\"word:foo\",\"kind\":\"word\"}" example({"item_id":"word:foo","kind":"word"})
// @Success 201 {object} response.APIResponse{data=models.SrsCard}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /srs/cards [post]
func (h *SRSHandler) CreateCard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		ItemID string `json:"item_id"`
		Kind   string `json:"kind"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	card, err := h.srsService.CreateCard(c.Context(), userID, req.ItemID, req.Kind)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, card)
}

// @Summary Get SRS stats
// @Description Get the user's SRS statistics (total, due, new, learning, review).
// @Tags SRS
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /srs/stats [get]
func (h *SRSHandler) GetStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	stats, err := h.srsService.GetStats(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, stats)
}
