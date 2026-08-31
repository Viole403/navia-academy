package repository

import (
	"context"
	"time"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type AchievementRepository struct {
	pool database.DBPool
}

func NewAchievementRepository(pool database.DBPool) *AchievementRepository {
	return &AchievementRepository{pool: pool}
}

func (r *AchievementRepository) CreateAchievement(ctx context.Context, userID, achievementID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO achievement (id, user_id, achievement_id, unlocked_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING
	`, "ach-"+userID+"-"+achievementID, userID, achievementID, time.Now())
	return err
}

func (r *AchievementRepository) GetAchievements(ctx context.Context, userID string) ([]models.Achievement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, achievement_id, unlocked_at
		FROM achievement WHERE user_id = $1 ORDER BY unlocked_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var achievements []models.Achievement
	for rows.Next() {
		var a models.Achievement
		if err := rows.Scan(&a.ID, &a.UserID, &a.AchievementID, &a.UnlockedAt); err != nil {
			return nil, err
		}
		achievements = append(achievements, a)
	}
	return achievements, rows.Err()
}
