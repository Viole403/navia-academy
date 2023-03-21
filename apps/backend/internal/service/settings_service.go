package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type SettingsService struct {
	settingsRepo *repository.SettingsRepository
}

func NewSettingsService(settingsRepo *repository.SettingsRepository) *SettingsService {
	return &SettingsService{settingsRepo: settingsRepo}
}

func (s *SettingsService) GetSettings(ctx context.Context, userID string) (*models.UserSettings, error) {
	settings, err := s.settingsRepo.GetByUserID(ctx, userID)
	if err != nil {
		defaultDM := models.DefaultDisplayMode
		return &models.UserSettings{
			UserID:          userID,
			Theme:           "scholar",
			Mode:            "light",
			FontSize:        "md",
			HanziSize:       "lg",
			DisplayMode:     &defaultDM,
			AudioRate:       0.85,
			AutoplayAudio:   true,
			SoundEffects:    true,
			DailyGoalMin:    30,
			NewWordsPerDay:  8,
			MaxReviewsPerDay: 60,
			Locale:          "en",
			ReduceMotion:    false,
			HighContrast:    false,
			Density:         "comfortable",
			FocusMode:       false,
			DailyReminder:   true,
			ReminderTime:    "19:00",
			WeeklySummary:   true,
			StreakAlerts:    true,
			PublicProfile:   false,
			ShowStats:       true,
			HiddenWidgets:   []string{},
			ActiveExamType:  "hsk",
			VoiceGender:     "female",
		}, nil
	}
	return settings, nil
}

func (s *SettingsService) UpdateSettings(ctx context.Context, userID string, req models.SettingsUpdateRequest) error {
	existing, _ := s.settingsRepo.GetByUserID(ctx, userID)

	settings := &models.UserSettings{
		UserID: userID,
	}

	if existing != nil {
		settings = existing
	}

	if req.Theme != nil {
		settings.Theme = *req.Theme
	}
	if req.Mode != nil {
		settings.Mode = *req.Mode
	}
	if req.FontSize != nil {
		settings.FontSize = *req.FontSize
	}
	if req.HanziSize != nil {
		settings.HanziSize = *req.HanziSize
	}
	if req.DisplayMode != nil {
		settings.DisplayMode = req.DisplayMode
	}
	if req.AudioRate != nil {
		settings.AudioRate = *req.AudioRate
	}
	if req.AutoplayAudio != nil {
		settings.AutoplayAudio = *req.AutoplayAudio
	}
	if req.SoundEffects != nil {
		settings.SoundEffects = *req.SoundEffects
	}
	if req.DailyGoalMin != nil {
		settings.DailyGoalMin = *req.DailyGoalMin
	}
	if req.NewWordsPerDay != nil {
		settings.NewWordsPerDay = *req.NewWordsPerDay
	}
	if req.MaxReviewsPerDay != nil {
		settings.MaxReviewsPerDay = *req.MaxReviewsPerDay
	}
	if req.Locale != nil {
		settings.Locale = *req.Locale
	}
	if req.ReduceMotion != nil {
		settings.ReduceMotion = *req.ReduceMotion
	}
	if req.HighContrast != nil {
		settings.HighContrast = *req.HighContrast
	}
	if req.Density != nil {
		settings.Density = *req.Density
	}
	if req.FocusMode != nil {
		settings.FocusMode = *req.FocusMode
	}
	if req.DailyReminder != nil {
		settings.DailyReminder = *req.DailyReminder
	}
	if req.ReminderTime != nil {
		settings.ReminderTime = *req.ReminderTime
	}
	if req.WeeklySummary != nil {
		settings.WeeklySummary = *req.WeeklySummary
	}
	if req.StreakAlerts != nil {
		settings.StreakAlerts = *req.StreakAlerts
	}
	if req.PublicProfile != nil {
		settings.PublicProfile = *req.PublicProfile
	}
	if req.ShowStats != nil {
		settings.ShowStats = *req.ShowStats
	}
	if req.HiddenWidgets != nil {
		settings.HiddenWidgets = req.HiddenWidgets
	}
	if req.ActiveExamType != nil {
		settings.ActiveExamType = *req.ActiveExamType
	}
	if req.VoiceGender != nil {
		settings.VoiceGender = *req.VoiceGender
	}

	if settings.ID == "" {
		settings.ID = uuid.New().String()
	}
	if settings.DisplayMode == nil {
		defaultDM := models.DefaultDisplayMode
		settings.DisplayMode = &defaultDM
	}
	if settings.HiddenWidgets == nil {
		settings.HiddenWidgets = []string{}
	}

	return s.settingsRepo.Upsert(ctx, settings)
}

func mergeJSON(base, patch json.RawMessage) json.RawMessage {
	if len(base) == 0 || string(base) == "null" {
		return patch
	}
	if len(patch) == 0 || string(patch) == "null" {
		return base
	}

	var baseMap map[string]interface{}
	var patchMap map[string]interface{}

	json.Unmarshal(base, &baseMap)
	json.Unmarshal(patch, &patchMap)

	if baseMap == nil || patchMap == nil {
		return patch
	}

	for k, v := range patchMap {
		baseMap[k] = v
	}

	result, _ := json.Marshal(baseMap)
	return result
}
