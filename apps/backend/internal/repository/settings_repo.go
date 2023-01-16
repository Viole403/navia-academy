package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type SettingsRepository struct {
	pool database.DBPool
}

func NewSettingsRepository(pool database.DBPool) *SettingsRepository {
	return &SettingsRepository{pool: pool}
}

func (r *SettingsRepository) GetByUserID(ctx context.Context, userID string) (*models.UserSettings, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, theme, mode, font_size, hanzi_size, display_mode, audio_rate,
		       autoplay_audio, sound_effects, daily_goal_min, new_words_per_day, max_reviews_per_day,
		       locale, reduce_motion, high_contrast, density, focus_mode, daily_reminder, reminder_time,
		       weekly_summary, streak_alerts, public_profile, show_stats, hidden_widgets,
		       active_exam_type, voice_gender, updated_at
		FROM user_settings WHERE user_id = $1
	`, userID)

	s := &models.UserSettings{}
	err := row.Scan(&s.ID, &s.UserID, &s.Theme, &s.Mode, &s.FontSize, &s.HanziSize, &s.DisplayMode,
		&s.AudioRate, &s.AutoplayAudio, &s.SoundEffects, &s.DailyGoalMin, &s.NewWordsPerDay,
		&s.MaxReviewsPerDay, &s.Locale, &s.ReduceMotion, &s.HighContrast, &s.Density, &s.FocusMode,
		&s.DailyReminder, &s.ReminderTime, &s.WeeklySummary, &s.StreakAlerts, &s.PublicProfile,
		&s.ShowStats, &s.HiddenWidgets, &s.ActiveExamType, &s.VoiceGender, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SettingsRepository) Upsert(ctx context.Context, s *models.UserSettings) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_settings (id, user_id, theme, mode, font_size, hanzi_size, display_mode,
		                           audio_rate, autoplay_audio, sound_effects, daily_goal_min,
		                           new_words_per_day, max_reviews_per_day, locale, reduce_motion,
		                           high_contrast, density, focus_mode, daily_reminder, reminder_time,
		                           weekly_summary, streak_alerts, public_profile, show_stats,
		                           hidden_widgets, active_exam_type, voice_gender)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
		ON CONFLICT (user_id) DO UPDATE SET
			theme = EXCLUDED.theme, mode = EXCLUDED.mode, font_size = EXCLUDED.font_size,
			hanzi_size = EXCLUDED.hanzi_size, display_mode = EXCLUDED.display_mode,
			audio_rate = EXCLUDED.audio_rate, autoplay_audio = EXCLUDED.autoplay_audio,
			sound_effects = EXCLUDED.sound_effects, daily_goal_min = EXCLUDED.daily_goal_min,
			new_words_per_day = EXCLUDED.new_words_per_day, max_reviews_per_day = EXCLUDED.max_reviews_per_day,
			locale = EXCLUDED.locale, reduce_motion = EXCLUDED.reduce_motion,
			high_contrast = EXCLUDED.high_contrast, density = EXCLUDED.density,
			focus_mode = EXCLUDED.focus_mode, daily_reminder = EXCLUDED.daily_reminder,
			reminder_time = EXCLUDED.reminder_time, weekly_summary = EXCLUDED.weekly_summary,
			streak_alerts = EXCLUDED.streak_alerts, public_profile = EXCLUDED.public_profile,
			show_stats = EXCLUDED.show_stats, hidden_widgets = EXCLUDED.hidden_widgets,
			active_exam_type = EXCLUDED.active_exam_type, voice_gender = EXCLUDED.voice_gender
	`, s.ID, s.UserID, s.Theme, s.Mode, s.FontSize, s.HanziSize, s.DisplayMode,
		s.AudioRate, s.AutoplayAudio, s.SoundEffects, s.DailyGoalMin, s.NewWordsPerDay,
		s.MaxReviewsPerDay, s.Locale, s.ReduceMotion, s.HighContrast, s.Density, s.FocusMode,
		s.DailyReminder, s.ReminderTime, s.WeeklySummary, s.StreakAlerts, s.PublicProfile,
		s.ShowStats, s.HiddenWidgets, s.ActiveExamType, s.VoiceGender)
	return err
}
