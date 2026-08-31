package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type GameRepository struct {
	pool database.DBPool
}

func NewGameRepository(pool database.DBPool) *GameRepository {
	return &GameRepository{pool: pool}
}

func (r *GameRepository) AddGameResult(ctx context.Context, g *models.GameResult) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO game_result (id, user_id, game_id, accuracy, score, played_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, g.ID, g.UserID, g.GameID, g.Accuracy, g.Score, g.PlayedAt)
	return err
}
