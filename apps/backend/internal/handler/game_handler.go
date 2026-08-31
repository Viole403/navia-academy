package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type GameHandler struct {
	gameService *service.GameService
}

func NewGameHandler(gameService *service.GameService) *GameHandler {
	return &GameHandler{gameService: gameService}
}

// @Summary Add game result
// @Description Record a game result (accuracy + score).
// @Tags Games
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Payload: {\"game_id\":\"tone-match\",\"accuracy\":0.8,\"score\":120}" example({"game_id":"tone-match","accuracy":0.8,"score":120})
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "ADD_FAILED"
// @Router /games [post]
func (h *GameHandler) AddGameResult(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		GameID   string  `json:"game_id" validate:"required"`
		Accuracy float64 `json:"accuracy"`
		Score    int     `json:"score"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.gameService.AddGameResult(c.Context(), userID, req.GameID, req.Accuracy, req.Score); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "ADD_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}
