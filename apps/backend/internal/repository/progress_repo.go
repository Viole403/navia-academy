package repository

import (
	"context"
	"encoding/json"
	"time"

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

func (r *ProgressRepository) CreateAchievement(ctx context.Context, userID, achievementID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO achievement (id, user_id, achievement_id, unlocked_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING
	`, "ach-"+userID+"-"+achievementID, userID, achievementID, time.Now())
	return err
}

func (r *ProgressRepository) GetAchievements(ctx context.Context, userID string) ([]models.Achievement, error) {
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
	return achievements, nil
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

func (r *ProgressRepository) CreateTask(ctx context.Context, t *models.Task) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO task (id, user_id, content, completed, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, t.ID, t.UserID, t.Content, t.Completed, t.DueDate, now, now)
	return err
}

func (r *ProgressRepository) UpdateTask(ctx context.Context, t *models.Task) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		UPDATE task SET content = $1, completed = $2, due_date = $3, updated_at = $4
		WHERE id = $5 AND user_id = $6
	`, t.Content, t.Completed, t.DueDate, now, t.ID, t.UserID)
	return err
}

func (r *ProgressRepository) DeleteTask(ctx context.Context, id, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM task WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *ProgressRepository) GetTasks(ctx context.Context, userID string) ([]models.Task, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, content, completed, due_date, created_at, updated_at
		FROM task WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.UserID, &t.Content, &t.Completed, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *ProgressRepository) AddGameResult(ctx context.Context, g *models.GameResult) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO game_result (id, user_id, game_id, accuracy, score, played_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, 		g.ID, g.UserID, g.GameID, g.Accuracy, g.Score, g.PlayedAt)
	return err
}
