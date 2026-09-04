package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type AchievementHandler struct {
	achievementService *service.AchievementService
}

func NewAchievementHandler(achievementService *service.AchievementService) *AchievementHandler {
	return &AchievementHandler{achievementService: achievementService}
}

// @Summary Get achievements
// @Description Get the user's unlocked achievements.
// @Tags Achievements
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.Achievement}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /progress/achievements [get]
func (h *AchievementHandler) GetAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var achievements []models.Achievement
	var err error
	achievements, err = h.achievementService.GetAchievements(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", "fetch failed")
	}

	return response.JSON(c, fiber.StatusOK, achievements)
}
