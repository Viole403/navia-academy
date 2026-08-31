package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type TaskHandler struct {
	taskService *service.TaskService
}

func NewTaskHandler(taskService *service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

// @Summary Create task
// @Description Create a user task.
// @Tags Tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"content\":\"Review HSK2 vocab\",\"due_date\":\"2026-08-16T10:00:00Z\"}" example({"content":"Review HSK2 vocab","due_date":"2026-08-16T10:00:00Z"})
// @Success 201 {object} response.APIResponse{data=models.Task}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /tasks [post]
func (h *TaskHandler) CreateTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		Content string  `json:"content" validate:"required"`
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

	task, err := h.taskService.CreateTask(c.Context(), userID, req.Content, dueDate)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, task)
}

// @Summary Update task
// @Description Update task content or completion status.
// @Tags Tasks
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
func (h *TaskHandler) UpdateTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	taskID := c.Params("id")

	var req struct {
		Content   *string `json:"content,omitempty"`
		Completed *bool   `json:"completed,omitempty"`
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

	if err := h.taskService.UpdateTask(c.Context(), task); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Delete task
// @Description Delete a user task by ID.
// @Tags Tasks
// @Produce json
// @Security BearerAuth
// @Param id path string true "Task ID"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "DELETE_FAILED"
// @Router /tasks/{id} [delete]
func (h *TaskHandler) DeleteTask(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	taskID := c.Params("id")

	if err := h.taskService.DeleteTask(c.Context(), taskID, userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "DELETE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Get tasks
// @Description Get the user's tasks.
// @Tags Tasks
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.Task}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /tasks [get]
func (h *TaskHandler) GetTasks(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	tasks, err := h.taskService.GetTasks(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, tasks)
}
