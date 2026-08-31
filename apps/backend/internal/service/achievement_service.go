package service

import (
	"context"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type AchievementService struct {
	achievementRepo *repository.AchievementRepository
}

func NewAchievementService(achievementRepo *repository.AchievementRepository) *AchievementService {
	return &AchievementService{achievementRepo: achievementRepo}
}

func (s *AchievementService) GetAchievements(ctx context.Context, userID string) ([]models.Achievement, error) {
	return s.achievementRepo.GetAchievements(ctx, userID)
}
