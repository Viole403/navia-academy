package models

import (
	"encoding/json"
	"time"
)

type ExamSession struct {
	ID                 int              `json:"id" db:"id"`
	UserID             string           `json:"user_id" db:"user_id"`
	ExamType           string           `json:"exam_type" db:"exam_type"`
	ExamLevel          string           `json:"exam_level" db:"exam_level"`
	Status             string           `json:"status" db:"status"`
	CurrentQuestionIndex int            `json:"current_question_index" db:"current_question_index"`
	Questions          *json.RawMessage `json:"questions,omitempty" db:"questions"`
	Answers            *json.RawMessage `json:"answers,omitempty" db:"answers"`
	StartedAt          time.Time        `json:"started_at" db:"started_at"`
	CompletedAt        *time.Time       `json:"completed_at,omitempty" db:"completed_at"`
	TimeLimit          *int             `json:"time_limit,omitempty" db:"time_limit"`
	TimeRemaining      *int             `json:"time_remaining,omitempty" db:"time_remaining"`
	QuestionCount      int              `json:"question_count" db:"question_count"`
	QuestionTypes      *json.RawMessage `json:"question_types,omitempty" db:"question_types"`
	DifficultyRange    *json.RawMessage `json:"difficulty_range,omitempty" db:"difficulty_range"`
	CreatedAt          time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at" db:"updated_at"`
}

type ExamResult struct {
	ID                   int              `json:"id" db:"id"`
	SessionID            int              `json:"session_id" db:"session_id"`
	UserID               string           `json:"user_id" db:"user_id"`
	ExamType             string           `json:"exam_type" db:"exam_type"`
	ExamLevel            string           `json:"exam_level" db:"exam_level"`
	TotalQuestions       int              `json:"total_questions" db:"total_questions"`
	CorrectAnswers       int              `json:"correct_answers" db:"correct_answers"`
	Score                int              `json:"score" db:"score"`
	PassingScore         int              `json:"passing_score" db:"passing_score"`
	ByQuestionType       *json.RawMessage `json:"by_question_type,omitempty" db:"by_question_type"`
	ByDifficulty         *json.RawMessage `json:"by_difficulty,omitempty" db:"by_difficulty"`
	TimeTaken            int              `json:"time_taken" db:"time_taken"`
	AverageTimePerQuestion int            `json:"average_time_per_question" db:"average_time_per_question"`
	RecommendedNextLevel *string          `json:"recommended_next_level,omitempty" db:"recommended_next_level"`
	WeakAreas            *json.RawMessage `json:"weak_areas,omitempty" db:"weak_areas"`
	Strengths            *json.RawMessage `json:"strengths,omitempty" db:"strengths"`
	CreatedAt            time.Time        `json:"created_at" db:"created_at"`
}

type ExamProgress struct {
	UserID            string           `json:"user_id" db:"user_id"`
	ExamType          string           `json:"exam_type" db:"exam_type"`
	LevelsCompleted   *json.RawMessage `json:"levels_completed,omitempty" db:"levels_completed"`
	CurrentLevel      *string          `json:"current_level,omitempty" db:"current_level"`
	HighestScore      int              `json:"highest_score" db:"highest_score"`
	AverageScore      int              `json:"average_score" db:"average_score"`
	TotalAttempts     int              `json:"total_attempts" db:"total_attempts"`
	ByLevel           *json.RawMessage `json:"by_level,omitempty" db:"by_level"`
	WeakQuestionTypes *json.RawMessage `json:"weak_question_types,omitempty" db:"weak_question_types"`
	WeakDifficultyLevels *json.RawMessage `json:"weak_difficulty_levels,omitempty" db:"weak_difficulty_levels"`
	UpdatedAt         time.Time        `json:"updated_at" db:"updated_at"`
}

type ExamQuestion struct {
	ID              int              `json:"id" db:"id"`
	Type            string           `json:"type" db:"type"`
	Difficulty      string           `json:"difficulty" db:"difficulty"`
	ExamType        string           `json:"exam_type" db:"exam_type"`
	ExamLevel       string           `json:"exam_level" db:"exam_level"`
	HskLevel        int              `json:"hsk_level" db:"hsk_level"`
	Prompt          string           `json:"prompt" db:"prompt"`
	PromptChinese   *string          `json:"prompt_chinese,omitempty" db:"prompt_chinese"`
	Options         *json.RawMessage `json:"options,omitempty" db:"options"`
	CorrectAnswer   *json.RawMessage `json:"correct_answer,omitempty" db:"correct_answer"`
	Explanation     *string          `json:"explanation,omitempty" db:"explanation"`
	VocabularyID    *string          `json:"vocabulary_id,omitempty" db:"vocabulary_id"`
	Tags            *json.RawMessage `json:"tags,omitempty" db:"tags"`
	Frequency       int              `json:"frequency" db:"frequency"`
	CreatedAt       time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at" db:"updated_at"`
	IsActive        bool             `json:"is_active" db:"is_active"`
}

type UserQuestionPerformance struct {
	UserID              string    `json:"user_id" db:"user_id"`
	QuestionID          int        `json:"question_id" db:"question_id"`
	Attempts            int        `json:"attempts" db:"attempts"`
	Correct             int        `json:"correct" db:"correct"`
	LastAttempt         time.Time  `json:"last_attempt" db:"last_attempt"`
	AverageTime         int        `json:"average_time" db:"average_time"`
	EstimatedDifficulty int        `json:"estimated_difficulty" db:"estimated_difficulty"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
}

type ExamSchedule struct {
	ID            int        `json:"id" db:"id"`
	UserID        string     `json:"user_id" db:"user_id"`
	ExamType      string     `json:"exam_type" db:"exam_type"`
	ExamLevel     string     `json:"exam_level" db:"exam_level"`
	ScheduledDate time.Time  `json:"scheduled_date" db:"scheduled_date"`
	ReminderSent  bool       `json:"reminder_sent" db:"reminder_sent"`
	ReminderSentAt *time.Time `json:"reminder_sent_at,omitempty" db:"reminder_sent_at"`
	Status        string     `json:"status" db:"status"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateExamRequest struct {
	ExamType  string                 `json:"exam_type" validate:"required" example:"hsk"`
	ExamLevel string                 `json:"exam_level" validate:"required" example:"1"`
	Settings  map[string]interface{} `json:"settings,omitempty"`
}

type SubmitAnswerRequest struct {
	SessionID  int         `json:"session_id" validate:"required" example:"1"`
	QuestionID string      `json:"question_id" validate:"required" example:"q_hsk_1_0"`
	Answer     interface{} `json:"answer" validate:"required"`
}

type SubmitExamRequest struct {
	SessionID int `json:"session_id" validate:"required" example:"1"`
}

type CatResultRequest struct {
	ExamType       string      `json:"exam_type" validate:"required" example:"hsk"`
	ExamLevel      string      `json:"exam_level" example:"1"`
	StartTheta     float64     `json:"start_theta" example:"550"`
	EloEstimate    float64     `json:"elo_estimate" validate:"required" example:"1150"`
	EloSD          float64     `json:"elo_sd" example:"60"`
	CefrBand       string      `json:"cefr_band" example:"B1"`
	TotalQuestions int         `json:"total_questions" example:"18"`
	CorrectAnswers int         `json:"correct_answers" example:"12"`
	TimeTaken      int         `json:"time_taken" example:"780"`
	Answers        []CatAnswer `json:"answers,omitempty"`
	EngineVersion  string      `json:"engine_version,omitempty" example:"elo-v1"`
	IntegrityFlag  bool        `json:"integrity_flag"`
}

type CatResult struct {
	ID             int        `json:"id" db:"id"`
	UserID         string     `json:"user_id" db:"user_id"`
	ExamType       string     `json:"exam_type" db:"exam_type"`
	ExamLevel      string     `json:"exam_level" db:"exam_level"`
	EloEstimate    float64    `json:"elo_estimate" db:"elo_estimate"`
	EloSD          float64    `json:"elo_sd" db:"elo_sd"`
	CefrBand       string     `json:"cefr_band" db:"cefr_band"`
	TotalQuestions int        `json:"total_questions" db:"total_questions"`
	CorrectAnswers int        `json:"correct_answers" db:"correct_answers"`
	TimeTaken      int         `json:"time_taken" db:"time_taken"`
	Answers        []CatAnswer `json:"answers,omitempty" db:"answers"`
	EngineVersion  string      `json:"engine_version,omitempty" db:"engine_version"`
	IntegrityFlag  bool        `json:"integrity_flag" db:"integrity_flag"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

type CatAnswer struct {
	ItemID   string  `json:"item_id"`   // vocab word id (dedupe key)
	ItemElo  float64 `json:"item_elo"`
	Correct  bool    `json:"correct"`
	Format   string  `json:"format"`    // meaning|listening|reading
}

type CatSession struct {
	ID        int         `json:"id" db:"id"`
	UserID    string      `json:"user_id" db:"user_id"`
	ExamType  string      `json:"exam_type" db:"exam_type"`
	Status    string      `json:"status" db:"status"`
	StartTheta float64    `json:"start_theta" db:"start_theta"`
	EngineVersion string  `json:"engine_version" db:"engine_version"`
	Answers   []CatAnswer `json:"answers" db:"answers"`
	ElapsedSec int        `json:"elapsed_sec"`
	TimeRemainingSec *int `json:"time_remaining_sec,omitempty" db:"time_remaining"`
	TimeLimitSec int      `json:"time_limit_sec" db:"time_limit"`
	StartedAt time.Time   `json:"started_at" db:"started_at"`
}

type CatSessionCreateRequest struct {
	ExamType   string  `json:"exam_type" validate:"required" example:"hsk"`
	StartTheta float64 `json:"start_theta" example:"550"`
	TimeLimitSec int   `json:"time_limit_sec" example:"5400"` // cap sesi (§9.1); 0 = server default 1200
}

type CatSessionPatchRequest struct {
	Answers    []CatAnswer `json:"answers" validate:"required"`
	ElapsedSec int         `json:"elapsed_sec" example:"120"`
	Theta      float64     `json:"theta" example:"600"` // current estimate (informational)
}

type TTSRequest struct {
	Text   string `json:"text" validate:"required" example:"你好，我叫小明"`
	Locale string `json:"locale" example:"zh-CN"`
	Gender string `json:"gender" example:"female"`
}
