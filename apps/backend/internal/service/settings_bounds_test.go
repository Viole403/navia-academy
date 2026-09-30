package service

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

// The settings endpoint takes these three as bare integers and the column has
// no CHECK constraint, so nothing below the service would refuse a queue of
// zero. It renders as "no sessions yet" with no way for the learner to tell
// that a value is wrong.
func TestUpdateSettingsClampsNumericFields(t *testing.T) {
	cases := []struct {
		name                             string
		in                               int
		newWords, maxReviews, goalMinutes int
	}{
		{"zero", 0, 1, 5, 1},
		{"negative", -10, 1, 5, 1},
		{"absurd", 100000, 200, 1000, 240},
		{"normal passes through", 12, 12, 12, 12},
	}
	for _, c := range cases {
		pool := &recordingPool{}
		svc := NewSettingsService(repository.NewSettingsRepository(pool))
		n := c.in
		err := svc.UpdateSettings(context.Background(), "u1", models.SettingsUpdateRequest{
			NewWordsPerDay:  &n,
			MaxReviewsPerDay: &n,
			DailyGoalMin:     &n,
		})
		if err != nil {
			t.Fatalf("%s: %v", c.name, err)
		}
		got := pool.upserted
		if got.NewWordsPerDay != c.newWords {
			t.Errorf("%s: new words stored %d, want %d", c.name, got.NewWordsPerDay, c.newWords)
		}
		if got.MaxReviewsPerDay != c.maxReviews {
			t.Errorf("%s: max reviews stored %d, want %d", c.name, got.MaxReviewsPerDay, c.maxReviews)
		}
		if got.DailyGoalMin != c.goalMinutes {
			t.Errorf("%s: goal stored %d, want %d", c.name, got.DailyGoalMin, c.goalMinutes)
		}
	}
}

type recordingPool struct{ upserted models.UserSettings }

func (p *recordingPool) Query(context.Context, string, ...any) (pgx.Rows, error) {
	return nil, nil
}
func (p *recordingPool) QueryRow(context.Context, string, ...any) pgx.Row {
	// A stored row is not needed; Scan failing is enough for the service to
	// fall through to its defaults, and it must not panic to get there.
	return noRow{}
}

// noRow stands in for a query that matched nothing.
type noRow struct{}

func (noRow) Scan(...any) error { return pgx.ErrNoRows }
func (p *recordingPool) Exec(_ context.Context, _ string, args ...any) (pgconn.CommandTag, error) {
	// The upsert passes fields positionally in the INSERT column order:
	// id, user_id, theme, mode, font_size, hanzi_size, display_mode, audio_rate,
	// autoplay_audio, sound_effects, daily_goal_min, new_words_per_day,
	// max_reviews_per_day. The repository arity test keeps that list honest.
	if len(args) >= 13 {
		p.upserted = models.UserSettings{
			DailyGoalMin:     asInt(args[10]),
			NewWordsPerDay:   asInt(args[11]),
			MaxReviewsPerDay: asInt(args[12]),
		}
	}
	return pgconn.CommandTag{}, nil
}

func asInt(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	}
	return -1
}

var _ database.DBPool = (*recordingPool)(nil)
