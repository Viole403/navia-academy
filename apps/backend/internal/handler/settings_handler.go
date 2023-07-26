package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type SettingsHandler struct {
	settingsService *service.SettingsService
}

func NewSettingsHandler(settingsService *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

// @Summary Get settings
// @Description Get the authenticated user's preferences.
// @Tags Settings
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=models.UserSettings}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /settings [get]
func (h *SettingsHandler) GetSettings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	settings, err := h.settingsService.GetSettings(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, settings)
}

// @Summary Update settings
// @Description Merge partial settings updates for the authenticated user.
// @Tags Settings
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.SettingsUpdateRequest true "Settings fields to update"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /settings [put]
func (h *SettingsHandler) UpdateSettings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.SettingsUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.settingsService.UpdateSettings(c.Context(), userID, req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}
