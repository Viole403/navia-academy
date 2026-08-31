package repository

import (
	"context"
	"encoding/json"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type ProgressRepository struct {
	pool database.DBPool
}

func NewProgressRepository(pool database.DBPool) *ProgressRepository {
	return &ProgressRepository{pool: pool}
}

func (r *ProgressRepository) GetByUserID(ctx context.Context, userID string) (*models.UserProgress, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, xp, streak, best_streak, last_study_date, started_at,
		       onboarding, placement, saved_word_ids, difficult_item_ids, data
		FROM user_progress WHERE user_id = $1
	`, userID)

	p := &models.UserProgress{}
	err := row.Scan(&p.ID, &p.UserID, &p.XP, &p.Streak, &p.BestStreak, &p.LastStudyDate,
		&p.StartedAt, &p.Onboarding, &p.Placement, &p.SavedWordIDs, &p.DifficultItemIDs, &p.Data)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProgressRepository) Upsert(ctx context.Context, p *models.UserProgress) error {
	dataJSON, _ := json.Marshal(p.Data)
	onboardingJSON, _ := json.Marshal(p.Onboarding)
	placementJSON, _ := json.Marshal(p.Placement)

	if p.SavedWordIDs == nil {
		p.SavedWordIDs = []string{}
	}
	if p.DifficultItemIDs == nil {
		p.DifficultItemIDs = []string{}
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_progress (id, user_id, xp, streak, best_streak, last_study_date, started_at,
		                           onboarding, placement, saved_word_ids, difficult_item_ids, data)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (user_id) DO UPDATE SET
			xp = EXCLUDED.xp, streak = EXCLUDED.streak, best_streak = EXCLUDED.best_streak,
			last_study_date = EXCLUDED.last_study_date, started_at = EXCLUDED.started_at,
			onboarding = EXCLUDED.onboarding, placement = EXCLUDED.placement,
			saved_word_ids = EXCLUDED.saved_word_ids, difficult_item_ids = EXCLUDED.difficult_item_ids,
			data = EXCLUDED.data
	`, p.ID, p.UserID, p.XP, p.Streak, p.BestStreak, p.LastStudyDate, p.StartedAt,
		onboardingJSON, placementJSON, p.SavedWordIDs, p.DifficultItemIDs, dataJSON)
	return err
}

func (r *ProgressRepository) AddStudySession(ctx context.Context, s *models.StudySession) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO study_session (id, user_id, date, minutes, xp, skills)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, s.ID, s.UserID, s.Date, s.Minutes, s.XP, s.Skills)
	return err
}

func (r *ProgressRepository) GetStudySessions(ctx context.Context, userID string, limit, offset int) ([]models.StudySession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, date, minutes, xp, skills
		FROM study_session WHERE user_id = $1
		ORDER BY date DESC LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.StudySession
	for rows.Next() {
		var s models.StudySession
		if err := rows.Scan(&s.ID, &s.UserID, &s.Date, &s.Minutes, &s.XP, &s.Skills); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}
