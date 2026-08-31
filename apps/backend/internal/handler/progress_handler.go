package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type ProgressHandler struct {
	progressService *service.ProgressService
}

func NewProgressHandler(progressService *service.ProgressService) *ProgressHandler {
	return &ProgressHandler{progressService: progressService}
}

// @Summary Get user progress
// @Description Get the authenticated user's learning progress (XP, streak, onboarding, placement).
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=models.UserProgress}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress [get]
func (h *ProgressHandler) GetProgress(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	progress, err := h.progressService.GetProgress(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, progress)
}

// @Summary Update user progress
// @Description Merge partial progress updates (XP, streak, onboarding, placement, saved words).
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.ProgressUpdateRequest true "Progress fields to update"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /progress [put]
func (h *ProgressHandler) UpdateProgress(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.ProgressUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.progressService.UpdateProgress(c.Context(), userID, req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Log study session
// @Description Record a study session (minutes + XP earned).
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"minutes\":15,\"xp\":10}" example({"minutes":15,"xp":10})
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "LOG_FAILED"
// @Router /progress/study-session [post]
func (h *ProgressHandler) LogStudySession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		Minutes int `json:"minutes"`
		XP      int `json:"xp"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.progressService.LogStudySession(c.Context(), userID, req.Minutes, req.XP); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "LOG_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Get study sessions
// @Description Get the user's study session history (paginated).
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Max results (default 50)" example(50)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} response.APIResponse{data=[]models.StudySession}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress/study-sessions [get]
func (h *ProgressHandler) GetStudySessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	sessions, err := h.progressService.GetStudySessions(c.Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, sessions)
}
