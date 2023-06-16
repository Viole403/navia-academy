package handler

import (
	"strconv"
	"time"

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

// @Summary Get due SRS cards
// @Description Get the user's SRS cards due for review (limit 200 max).
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Max cards (default 50, max 200)" example(50)
// @Success 200 {object} response.APIResponse{data=[]models.SrsCard}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress/due-cards [get]
func (h *ProgressHandler) GetDueCards(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	cards, err := h.progressService.GetDueCards(c.Context(), userID, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, cards)
}

// @Summary Review SRS card
// @Description Grade a card (0–3) and apply SM-2 style scheduling.
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.SRSReviewRequest true "Card + grade"
// @Success 200 {object} response.APIResponse{data=models.SrsCard}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "REVIEW_FAILED"
// @Router /progress/review [post]
func (h *ProgressHandler) ReviewCard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.SRSReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	card, err := h.progressService.ReviewCard(c.Context(), userID, req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "REVIEW_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, card)
}

// @Summary Get achievements
// @Description Get the user's unlocked achievements.
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.Achievement}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress/achievements [get]
func (h *ProgressHandler) GetAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	achievements, err := h.progressService.GetAchievements(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, achievements)
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

// @Summary Create task
// @Description Create a user task.
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"content\":\"Review HSK2 vocab\",\"due_date\":\"2026-08-16T10:00:00Z\"}" example({"content":"Review HSK2 vocab","due_date":"2026-08-16T10:00:00Z"})
// @Success 201 {object} response.APIResponse{data=models.Task}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /tasks [post]
func (h *ProgressHandler) CreateTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		Content string `json:"content" validate:"required"`
		DueDate *string `json:"due_date,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	var dueDate *time.Time
	if req.DueDate != nil {
		if t, err := time.Parse(time.RFC3339, *req.DueDate); err == nil {
			dueDate = &t
		}
	}

	task, err := h.progressService.CreateTask(c.Context(), userID, req.Content, dueDate)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, task)
}

// @Summary Update task
// @Description Update task content or completion status.
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Task ID"
// @Param body body object true "Payload: {\"content\":\"...\",\"completed\":true}" example({"completed":true})
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /tasks/{id} [put]
func (h *ProgressHandler) UpdateTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	taskID := c.Params("id")

	var req struct {
		Content  *string `json:"content,omitempty"`
		Completed *bool  `json:"completed,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	task := &models.Task{
		ID:     taskID,
		UserID: userID,
	}
	if req.Content != nil {
		task.Content = *req.Content
	}
	if req.Completed != nil {
		task.Completed = *req.Completed
	}

	if err := h.progressService.UpdateTask(c.Context(), task); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Delete task
// @Description Delete a user task by ID.
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Param id path string true "Task ID"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "DELETE_FAILED"
// @Router /tasks/{id} [delete]
func (h *ProgressHandler) DeleteTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	taskID := c.Params("id")

	if err := h.progressService.DeleteTask(c.Context(), taskID, userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "DELETE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Get tasks
// @Description Get the user's tasks.
// @Tags Progress
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.Task}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /tasks [get]
func (h *ProgressHandler) GetTasks(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	tasks, err := h.progressService.GetTasks(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, tasks)
}

// @Summary Add game result
// @Description Record a game result (accuracy + score).
// @Tags Progress
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"game_id\":\"tone-match\",\"accuracy\":0.8,\"score\":120}" example({"game_id":"tone-match","accuracy":0.8,"score":120})
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "ADD_FAILED"
// @Router /games [post]
func (h *ProgressHandler) AddGameResult(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		GameID   string  `json:"game_id" validate:"required"`
		Accuracy float64 `json:"accuracy"`
		Score    int     `json:"score"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.progressService.AddGameResult(c.Context(), userID, req.GameID, req.Accuracy, req.Score); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "ADD_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}
