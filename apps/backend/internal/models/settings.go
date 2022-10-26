package models

import (
	"encoding/json"
	"time"
)

type UserSettings struct {
	ID              string           `json:"id" db:"id"`
	UserID          string           `json:"user_id" db:"user_id"`
	Theme           string           `json:"theme" db:"theme"`
	Mode            string           `json:"mode" db:"mode"`
	FontSize        string           `json:"font_size" db:"font_size"`
	HanziSize       string           `json:"hanzi_size" db:"hanzi_size"`
	DisplayMode     *json.RawMessage `json:"display_mode,omitempty" db:"display_mode"`
	AudioRate       float64          `json:"audio_rate" db:"audio_rate"`
	AutoplayAudio   bool             `json:"autoplay_audio" db:"autoplay_audio"`
	SoundEffects    bool             `json:"sound_effects" db:"sound_effects"`
	DailyGoalMin    int              `json:"daily_goal_min" db:"daily_goal_min"`
	NewWordsPerDay  int              `json:"new_words_per_day" db:"new_words_per_day"`
	MaxReviewsPerDay int             `json:"max_reviews_per_day" db:"max_reviews_per_day"`
	Locale          string           `json:"locale" db:"locale"`
	ReduceMotion    bool             `json:"reduce_motion" db:"reduce_motion"`
	HighContrast    bool             `json:"high_contrast" db:"high_contrast"`
	Density         string           `json:"density" db:"density"`
	FocusMode       bool             `json:"focus_mode" db:"focus_mode"`
	DailyReminder   bool             `json:"daily_reminder" db:"daily_reminder"`
	ReminderTime    string           `json:"reminder_time" db:"reminder_time"`
	WeeklySummary   bool             `json:"weekly_summary" db:"weekly_summary"`
	StreakAlerts    bool             `json:"streak_alerts" db:"streak_alerts"`
	PublicProfile   bool             `json:"public_profile" db:"public_profile"`
	ShowStats       bool             `json:"show_stats" db:"show_stats"`
	HiddenWidgets   []string         `json:"hidden_widgets" db:"hidden_widgets"`
	ActiveExamType  string           `json:"active_exam_type" db:"active_exam_type"`
	VoiceGender     string           `json:"voice_gender" db:"voice_gender"`
	UpdatedAt       time.Time        `json:"updated_at" db:"updated_at"`
}

type SettingsUpdateRequest struct {
	Theme           *string          `json:"theme,omitempty"`
	Mode            *string          `json:"mode,omitempty"`
	FontSize        *string          `json:"font_size,omitempty"`
	HanziSize       *string          `json:"hanzi_size,omitempty"`
	DisplayMode     *json.RawMessage `json:"display_mode,omitempty"`
	AudioRate       *float64         `json:"audio_rate,omitempty"`
	AutoplayAudio   *bool            `json:"autoplay_audio,omitempty"`
	SoundEffects    *bool            `json:"sound_effects,omitempty"`
	DailyGoalMin    *int             `json:"daily_goal_min,omitempty"`
	NewWordsPerDay  *int             `json:"new_words_per_day,omitempty"`
	MaxReviewsPerDay *int            `json:"max_reviews_per_day,omitempty"`
	Locale          *string          `json:"locale,omitempty"`
	ReduceMotion    *bool            `json:"reduce_motion,omitempty"`
	HighContrast    *bool            `json:"high_contrast,omitempty"`
	Density         *string          `json:"density,omitempty"`
	FocusMode       *bool            `json:"focus_mode,omitempty"`
	DailyReminder   *bool            `json:"daily_reminder,omitempty"`
	ReminderTime    *string          `json:"reminder_time,omitempty"`
	WeeklySummary   *bool            `json:"weekly_summary,omitempty"`
	StreakAlerts    *bool            `json:"streak_alerts,omitempty"`
	PublicProfile   *bool            `json:"public_profile,omitempty"`
	ShowStats       *bool            `json:"show_stats,omitempty"`
	HiddenWidgets   []string         `json:"hidden_widgets,omitempty"`
	ActiveExamType  *string          `json:"active_exam_type,omitempty"`
	VoiceGender     *string          `json:"voice_gender,omitempty"`
}

var DefaultDisplayMode = json.RawMessage(`{"script":"simplified","mode":"hanyu+trans","adaptiveByLevel":false,"levelOverrides":{}}`)
