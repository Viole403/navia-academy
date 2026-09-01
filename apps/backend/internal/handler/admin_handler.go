package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type AdminHandler struct {
	userRepo *repository.UserRepository
}

func NewAdminHandler(userRepo *repository.UserRepository) *AdminHandler {
	return &AdminHandler{userRepo: userRepo}
}

// @Summary Set user role
// @Description Update a user's role (admin). Valid roles: student, contributor, reviewer, admin.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param body body models.SetUserRoleRequest true "New role"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_ROLE / MISSING_BODY / USER_NOT_FOUND"
// @Failure 403 {object} response.APIError "FORBIDDEN"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /admin/users/:id/role [put]
// @Summary List users
// @Description Admin-only. Returns all user accounts (id, name, email, role).
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.User}
// @Failure 403 {object} response.APIError "FORBIDDEN"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /admin/users [get]
func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if offset < 0 {
		offset = 0
	}
	users, err := h.userRepo.ListAll(c.Context(), limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	if users == nil {
		users = []models.User{}
	}
	return response.JSON(c, fiber.StatusOK, users)
}

func (h *AdminHandler) SetUserRole(c *fiber.Ctx) error {
	var req models.SetUserRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}
	if !service.ValidRoles[req.Role] {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_ROLE", "role must be one of: student, contributor, reviewer, admin")
	}

	userID := c.Params("id")
	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "USER_NOT_FOUND", "user not found")
	}

	if err := h.userRepo.UpdateRole(c.Context(), user.ID, req.Role); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, map[string]string{"id": user.ID, "role": req.Role})
}
