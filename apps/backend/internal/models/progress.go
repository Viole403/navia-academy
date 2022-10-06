package models

import (
	"encoding/json"
	"time"
)

type SrsCard struct {
	ID            string     `json:"id" db:"id"`
	UserID        string     `json:"user_id" db:"user_id"`
	ItemID        string     `json:"item_id" db:"item_id"`
	Kind          string     `json:"kind" db:"kind"`
	Mastery       int        `json:"mastery" db:"mastery"`
	Interval      int        `json:"interval" db:"interval"`
	Ease          float64    `json:"ease" db:"ease"`
	DueDate       time.Time  `json:"due_date" db:"due_date"`
	TotalReviews  int        `json:"total_reviews" db:"total_reviews"`
	CorrectStreak int        `json:"correct_streak" db:"correct_streak"`
	LastReview    *time.Time `json:"last_review,omitempty" db:"last_review"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type UserProgress struct {
	ID               string           `json:"id" db:"id"`
	UserID           string           `json:"user_id" db:"user_id"`
	XP               int              `json:"xp" db:"xp"`
	Streak           int              `json:"streak" db:"streak"`
	BestStreak       int              `json:"best_streak" db:"best_streak"`
	LastStudyDate    *time.Time       `json:"last_study_date,omitempty" db:"last_study_date"`
	StartedAt        time.Time        `json:"started_at" db:"started_at"`
	Onboarding       *json.RawMessage `json:"onboarding,omitempty" db:"onboarding"`
	Placement        *json.RawMessage `json:"placement,omitempty" db:"placement"`
	SavedWordIDs     []string         `json:"saved_word_ids" db:"saved_word_ids"`
	DifficultItemIDs []string         `json:"difficult_item_ids" db:"difficult_item_ids"`
	Data             *json.RawMessage `json:"data,omitempty" db:"data"`
}

func (p *UserProgress) DefaultOnboarding() json.RawMessage {
	return json.RawMessage(`{"completed":false,"step":0}`)
}

type StudySession struct {
	ID      string           `json:"id" db:"id"`
	UserID  string           `json:"user_id" db:"user_id"`
	Date    string           `json:"date" db:"date"`
	Minutes int              `json:"minutes" db:"minutes"`
	XP      int              `json:"xp" db:"xp"`
	Skills  *json.RawMessage `json:"skills,omitempty" db:"skills"`
}

type AssessmentAttempt struct {
	ID           string           `json:"id" db:"id"`
	UserID       string           `json:"user_id" db:"user_id"`
	AssessmentID string           `json:"assessment_id" db:"assessment_id"`
	Score        int              `json:"score" db:"score"`
	Answers      *json.RawMessage `json:"answers,omitempty" db:"answers"`
	CompletedAt  time.Time        `json:"completed_at" db:"completed_at"`
}

type GameResult struct {
	ID       string    `json:"id" db:"id"`
	UserID   string    `json:"user_id" db:"user_id"`
	GameID   string    `json:"game_id" db:"game_id"`
	Accuracy float64   `json:"accuracy" db:"accuracy"`
	Score    int       `json:"score" db:"score"`
	PlayedAt time.Time `json:"played_at" db:"played_at"`
}

type Achievement struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"user_id" db:"user_id"`
	AchievementID string    `json:"achievement_id" db:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at" db:"unlocked_at"`
}

type Task struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"user_id" db:"user_id"`
	Content   string     `json:"content" db:"content"`
	Completed bool       `json:"completed" db:"completed"`
	DueDate   *time.Time `json:"due_date,omitempty" db:"due_date"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type ProgressUpdateRequest struct {
	XP               *int              `json:"xp,omitempty"`
	Streak           *int              `json:"streak,omitempty"`
	BestStreak       *int              `json:"best_streak,omitempty"`
	LastStudyDate    *string           `json:"last_study_date,omitempty"`
	StartedAt        *string           `json:"started_at,omitempty"`
	Onboarding       *json.RawMessage  `json:"onboarding,omitempty"`
	Placement        *json.RawMessage  `json:"placement,omitempty"`
	SavedWordIDs     []string          `json:"saved_word_ids,omitempty"`
	DifficultItemIDs []string          `json:"difficult_item_ids,omitempty"`
	Data             *json.RawMessage  `json:"data,omitempty"`
}

type SRSReviewRequest struct {
	ItemID string `json:"item_id" validate:"required" example:"zh-vocab-hsk1-001"`
	Kind   string `json:"kind" validate:"required,oneof=word character grammar" example:"word"`
	Grade  int    `json:"grade" validate:"required,min=0,max=3" example:"3"`
}
