package repository

import (
	"context"
	"encoding/json"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type ExamRepository struct {
	pool database.DBPool
}

func NewExamRepository(pool database.DBPool) *ExamRepository {
	return &ExamRepository{pool: pool}
}

func (r *ExamRepository) CreateSession(ctx context.Context, s *models.ExamSession) (*models.ExamSession, error) {
	var id int
	questionsJSON, _ := json.Marshal(s.Questions)
	answersJSON, _ := json.Marshal(s.Answers)
	qtJSON, _ := json.Marshal(s.QuestionTypes)
	drJSON, _ := json.Marshal(s.DifficultyRange)

	err := r.pool.QueryRow(ctx, `
		INSERT INTO exam_sessions (user_id, exam_type, exam_level, status, current_question_index,
		                           questions, answers, started_at, time_limit, time_remaining,
		                           question_count, question_types, difficulty_range)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id
	`, s.UserID, s.ExamType, s.ExamLevel, s.Status, s.CurrentQuestionIndex,
		questionsJSON, answersJSON, s.StartedAt, s.TimeLimit, s.TimeRemaining,
		s.QuestionCount, qtJSON, drJSON).Scan(&id)
	if err != nil {
		return nil, err
	}
	s.ID = id
	return s, nil
}

func (r *ExamRepository) GetSessionByID(ctx context.Context, sessionID int, userID string) (*models.ExamSession, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, exam_type, exam_level, status, current_question_index,
		       questions, answers, started_at, completed_at, time_limit, time_remaining,
		       question_count, question_types, difficulty_range, created_at, updated_at
		FROM exam_sessions WHERE id = $1 AND user_id = $2
	`, sessionID, userID)

	s := &models.ExamSession{}
	err := row.Scan(&s.ID, &s.UserID, &s.ExamType, &s.ExamLevel, &s.Status, &s.CurrentQuestionIndex,
		&s.Questions, &s.Answers, &s.StartedAt, &s.CompletedAt, &s.TimeLimit, &s.TimeRemaining,
		&s.QuestionCount, &s.QuestionTypes, &s.DifficultyRange, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *ExamRepository) UpdateSession(ctx context.Context, s *models.ExamSession) error {
	answersJSON, _ := json.Marshal(s.Answers)
	_, err := r.pool.Exec(ctx, `
		UPDATE exam_sessions SET status = $1, current_question_index = $2, answers = $3,
		                         completed_at = $4, time_remaining = $5, updated_at = NOW()
		WHERE id = $6 AND user_id = $7
	`, s.Status, s.CurrentQuestionIndex, answersJSON, s.CompletedAt, s.TimeRemaining, s.ID, s.UserID)
	return err
}

func (r *ExamRepository) GetActiveSessions(ctx context.Context, userID string) ([]models.ExamSession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, exam_type, exam_level, status, current_question_index,
		       questions, answers, started_at, completed_at, time_limit, time_remaining,
		       question_count, question_types, difficulty_range, created_at, updated_at
		FROM exam_sessions WHERE user_id = $1 AND status = 'in_progress'
		ORDER BY started_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.ExamSession
	for rows.Next() {
		var s models.ExamSession
		if err := rows.Scan(&s.ID, &s.UserID, &s.ExamType, &s.ExamLevel, &s.Status, &s.CurrentQuestionIndex,
			&s.Questions, &s.Answers, &s.StartedAt, &s.CompletedAt, &s.TimeLimit, &s.TimeRemaining,
			&s.QuestionCount, &s.QuestionTypes, &s.DifficultyRange, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *ExamRepository) CreateResult(ctx context.Context, res *models.ExamResult) (*models.ExamResult, error) {
	var id int
	bqJSON, _ := json.Marshal(res.ByQuestionType)
	bdJSON, _ := json.Marshal(res.ByDifficulty)
	waJSON, _ := json.Marshal(res.WeakAreas)
	stJSON, _ := json.Marshal(res.Strengths)

	err := r.pool.QueryRow(ctx, `
		INSERT INTO exam_results (session_id, user_id, exam_type, exam_level, total_questions,
		                          correct_answers, score, passing_score, by_question_type, by_difficulty,
		                          time_taken, average_time_per_question, recommended_next_level,
		                          weak_areas, strengths)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING id
	`, res.SessionID, res.UserID, res.ExamType, res.ExamLevel,
		res.TotalQuestions, res.CorrectAnswers, res.Score, res.PassingScore,
		bqJSON, bdJSON, res.TimeTaken, res.AverageTimePerQuestion,
		res.RecommendedNextLevel, waJSON, stJSON).Scan(&id)
	if err != nil {
		return nil, err
	}
	res.ID = id
	return res, nil
}

func (r *ExamRepository) GetExamHistory(ctx context.Context, userID, examType string, limit, offset int) ([]models.ExamResult, int64, error) {
	where := "WHERE user_id = $1"
	args := []interface{}{userID}
	argIdx := 2

	if examType != "" {
		where += " AND exam_type = $" + string(rune('0'+argIdx))
		args = append(args, examType)
		argIdx++
	}

	var total int64
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM exam_results `+where, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT id, session_id, user_id, exam_type, exam_level, total_questions, correct_answers,
		       score, passing_score, by_question_type, by_difficulty, time_taken,
		       average_time_per_question, recommended_next_level, weak_areas, strengths, created_at
		FROM exam_results `+where+` ORDER BY created_at DESC LIMIT $`+string(rune('0'+argIdx))+` OFFSET $`+string(rune('0'+argIdx+1)),
		args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.ExamResult
	for rows.Next() {
		var res models.ExamResult
		if err := rows.Scan(&res.ID, &res.SessionID, &res.UserID, &res.ExamType, &res.ExamLevel,
			&res.TotalQuestions, &res.CorrectAnswers, &res.Score, &res.PassingScore,
			&res.ByQuestionType, &res.ByDifficulty, &res.TimeTaken, &res.AverageTimePerQuestion,
			&res.RecommendedNextLevel, &res.WeakAreas, &res.Strengths, &res.CreatedAt); err != nil {
			return nil, 0, err
		}
		results = append(results, res)
	}
	return results, total, nil
}

func (r *ExamRepository) CreateCatSession(ctx context.Context, s *models.CatSession) (*models.CatSession, error) {
	var id int
	err := r.pool.QueryRow(ctx, `
		INSERT INTO exam_sessions (user_id, exam_type, exam_level, status, cat_mode,
		                          time_limit, theta_estim, theta_sd,
		                          engine_version, start_theta, last_answer_at)
		VALUES ($1,$2,$3,'in_progress',true,$4,$5,0,$6,$7,now())
		RETURNING id
	`, s.UserID, s.ExamType, s.ExamType, s.TimeLimitSec, s.StartTheta,
		s.EngineVersion, s.StartTheta).Scan(&id)
	if err != nil {
		return nil, err
	}
	s.ID = id
	s.Status = "in_progress"
	return s, nil
}

// idempotent: upsert answers by item_id (server-side dedupe against replay/retry)
func (r *ExamRepository) PatchCatSession(ctx context.Context, sessionID int, userID string, in []models.CatAnswer, elapsedSec int, theta float64) error {
	answersJSON, _ := json.Marshal(in)
	timeLimit := 0
	if err := r.pool.QueryRow(ctx, `SELECT time_limit FROM exam_sessions WHERE id=$1 AND user_id=$2`, sessionID, userID).Scan(&timeLimit); err != nil {
		return err
	}
	timeRemaining := timeLimit - elapsedSec
	if timeRemaining < 0 {
		timeRemaining = 0
	}
	var uid string
	err := r.pool.QueryRow(ctx, `
		UPDATE exam_sessions
		SET answers = $1, current_question_index = $2, theta_estim = $3,
		    time_remaining = $4, last_answer_at = now(), updated_at = now()
		WHERE id = $5 AND user_id = $6
		RETURNING user_id
	`, answersJSON, len(in), theta, timeRemaining, sessionID, userID).Scan(&uid)
	return err
}

func (r *ExamRepository) GetCatSession(ctx context.Context, sessionID int, userID string) (*models.CatSession, error) {
	var s models.CatSession
	var answersJSON []byte
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, exam_type, status, start_theta, engine_version,
		       COALESCE(answers::text,'[]'), time_limit, time_remaining, started_at
		FROM exam_sessions WHERE id=$1 AND user_id=$2
	`, sessionID, userID).Scan(&s.ID, &s.UserID, &s.ExamType, &s.Status,
		&s.StartTheta, &s.EngineVersion, &answersJSON, &s.TimeLimitSec,
		&s.TimeRemainingSec, &s.StartedAt)
	if err != nil {
		return nil, err
	}
	s.Answers = nil
	if len(answersJSON) > 0 {
		_ = json.Unmarshal(answersJSON, &s.Answers)
	}
	if s.TimeRemainingSec != nil {
		s.ElapsedSec = s.TimeLimitSec - *s.TimeRemainingSec
	}
	return &s, nil
}

func (r *ExamRepository) CreateCatResult(ctx context.Context, res *models.CatResult) (*models.CatResult, error) {
	var id int
	answersJSON, _ := json.Marshal(res.Answers)
	err := r.pool.QueryRow(ctx, `
		INSERT INTO exam_results (user_id, exam_type, exam_level, total_questions, correct_answers,
		                          score, passing_score, time_taken, elo_estimate, elo_sd,
		                          cefr_band, integrity_flag, answers, engine_version)
		VALUES ($1,$2,$3,$4,$5,0,0,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at
	`, res.UserID, res.ExamType, res.ExamLevel, res.TotalQuestions, res.CorrectAnswers,
		res.TimeTaken, res.EloEstimate, res.EloSD, res.CefrBand, res.IntegrityFlag,
		answersJSON, res.EngineVersion).Scan(&id, &res.CreatedAt)
	if err != nil {
		return nil, err
	}
	res.ID = id
	return res, nil
}

func (r *ExamRepository) GetCatProgress(ctx context.Context, userID string) ([]models.CatResult, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, exam_type, exam_level, elo_estimate, elo_sd, cefr_band,
		       total_questions, correct_answers, time_taken, integrity_flag, created_at
		FROM exam_results
		WHERE user_id = $1 AND elo_estimate IS NOT NULL
		ORDER BY created_at DESC LIMIT 50
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.CatResult
	for rows.Next() {
		var res models.CatResult
		if err := rows.Scan(&res.ID, &res.UserID, &res.ExamType, &res.ExamLevel, &res.EloEstimate,
			&res.EloSD, &res.CefrBand, &res.TotalQuestions, &res.CorrectAnswers,
			&res.TimeTaken, &res.IntegrityFlag, &res.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, res)
	}
	return results, nil
}

func (r *ExamRepository) GetUserExamProgress(ctx context.Context, userID string) ([]models.ExamProgress, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT user_id, exam_type, levels_completed, current_level, highest_score, average_score,
		       total_attempts, by_level, weak_question_types, weak_difficulty_levels, updated_at
		FROM exam_progress WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var progress []models.ExamProgress
	for rows.Next() {
		var p models.ExamProgress
		if err := rows.Scan(&p.UserID, &p.ExamType, &p.LevelsCompleted, &p.CurrentLevel,
			&p.HighestScore, &p.AverageScore, &p.TotalAttempts, &p.ByLevel,
			&p.WeakQuestionTypes, &p.WeakDifficultyLevels, &p.UpdatedAt); err != nil {
			return nil, err
		}
		progress = append(progress, p)
	}
	return progress, nil
}

func (r *ExamRepository) UpsertExamProgress(ctx context.Context, p *models.ExamProgress) error {
	lcJSON, _ := json.Marshal(p.LevelsCompleted)
	blJSON, _ := json.Marshal(p.ByLevel)
	wqJSON, _ := json.Marshal(p.WeakQuestionTypes)
	wdJSON, _ := json.Marshal(p.WeakDifficultyLevels)

	_, err := r.pool.Exec(ctx, `
		INSERT INTO exam_progress (user_id, exam_type, levels_completed, current_level, highest_score,
		                           average_score, total_attempts, by_level, weak_question_types,
		                           weak_difficulty_levels, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
		ON CONFLICT (user_id, exam_type) DO UPDATE SET
			levels_completed = EXCLUDED.levels_completed,
			current_level = EXCLUDED.current_level,
			highest_score = EXCLUDED.highest_score,
			average_score = EXCLUDED.average_score,
			total_attempts = EXCLUDED.total_attempts,
			by_level = EXCLUDED.by_level,
			weak_question_types = EXCLUDED.weak_question_types,
			weak_difficulty_levels = EXCLUDED.weak_difficulty_levels,
			updated_at = NOW()
	`, p.UserID, p.ExamType, lcJSON, p.CurrentLevel, p.HighestScore, p.AverageScore,
		p.TotalAttempts, blJSON, wqJSON, wdJSON)
	return err
}
