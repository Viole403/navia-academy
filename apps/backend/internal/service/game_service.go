package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type GameService struct {
	gameRepo *repository.GameRepository
}

func NewGameService(gameRepo *repository.GameRepository) *GameService {
	return &GameService{gameRepo: gameRepo}
}

func (s *GameService) AddGameResult(ctx context.Context, userID, gameID string, accuracy float64, score int) error {
	result := &models.GameResult{
		ID:       uuid.New().String(),
		UserID:   userID,
		GameID:   gameID,
		Accuracy: accuracy,
		Score:    score,
		PlayedAt: time.Now(),
	}
	return s.gameRepo.AddGameResult(ctx, result)
}
