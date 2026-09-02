package service

import (
	"testing"
	"time"

	"github.com/navia-academy/backend/internal/models"
)

func newTestCard() *models.SrsCard {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	return &models.SrsCard{
		ItemID:        "zh-vocab-hsk1-001",
		Kind:          "word",
		Mastery:       0,
		Interval:      0,
		Ease:          DefaultEase,
		DueDate:       now,
		TotalReviews:  0,
		CorrectStreak: 0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

func TestNewCard(t *testing.T) {
	s := NewSRSService()
	card := s.NewCard("zh-vocab-hsk1-001", "word")
	if card.Mastery != 0 {
		t.Errorf("Mastery = %d; want 0", card.Mastery)
	}
	if card.Ease != DefaultEase {
		t.Errorf("Ease = %.2f; want %.2f", card.Ease, DefaultEase)
	}
	if card.Interval != 0 {
		t.Errorf("Interval = %d; want 0", card.Interval)
	}
	if card.DueDate.IsZero() {
		t.Error("DueDate should not be zero")
	}
}

func TestGradeCardProgression(t *testing.T) {
	s := NewSRSService()
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	t.Run("grade 3 builds interval 1→2→5→...", func(t *testing.T) {
		card := newTestCard()
		// 1st review (grade 3)
		c1 := s.GradeCard(card, 3, now)
		if c1.Interval != 2 {
			t.Errorf("interval after 1st review = %d; want 2", c1.Interval)
		}
		if c1.Mastery != 18 {
			t.Errorf("mastery after 1st = %d; want 18", c1.Mastery)
		}
		// 2nd review (grade 3)
		c2 := s.GradeCard(c1, 3, now.AddDate(0, 0, 2))
		if c2.Interval != 5 {
			t.Errorf("interval after 2nd review = %d; want 5", c2.Interval)
		}
		// 3rd review (grade 3): interval = round(5 * ease * 1.3); ease grew to 2.7
		c3 := s.GradeCard(c2, 3, now.AddDate(0, 0, 7))
		want := int(round64(float64(c2.Interval) * c2.Ease * 1.3))
		if c3.Interval != want {
			t.Errorf("interval after 3rd review = %d; want %d", c3.Interval, want)
		}
		if c3.TotalReviews != 3 {
			t.Errorf("TotalReviews = %d; want 3", c3.TotalReviews)
		}
		if c3.CorrectStreak != 3 {
			t.Errorf("CorrectStreak = %d; want 3", c3.CorrectStreak)
		}
	})

	t.Run("grade 2 uses 1→3→interval*ease", func(t *testing.T) {
		card := newTestCard()
		c1 := s.GradeCard(card, 2, now)
		if c1.Interval != 1 {
			t.Errorf("interval after 1st grade-2 = %d; want 1", c1.Interval)
		}
		c2 := s.GradeCard(c1, 2, now.AddDate(0, 0, 1))
		if c2.Interval != 3 {
			t.Errorf("interval after 2nd grade-2 = %d; want 3", c2.Interval)
		}
		c3 := s.GradeCard(c2, 2, now.AddDate(0, 0, 4))
		want := int(round64(float64(3) * DefaultEase))
		if c3.Interval != want {
			t.Errorf("interval after 3rd grade-2 = %d; want %d", c3.Interval, want)
		}
	})

	t.Run("grade 0 resets", func(t *testing.T) {
		card := newTestCard()
		c1 := s.GradeCard(card, 3, now)
		c2 := s.GradeCard(c1, 0, now.AddDate(0, 0, 2))
		if c2.Interval != 0 {
			t.Errorf("interval after grade 0 = %d; want 0", c2.Interval)
		}
		if c2.TotalReviews != 0 {
			t.Errorf("TotalReviews after reset = %d; want 0", c2.TotalReviews)
		}
		if c2.CorrectStreak != 0 {
			t.Errorf("CorrectStreak after reset = %d; want 0", c2.CorrectStreak)
		}
		if !c2.DueDate.Equal(now.AddDate(0, 0, 2)) {
			t.Errorf("grade-0 due date = %v; want same-day re-due", c2.DueDate)
		}
		if c2.Ease >= DefaultEase {
			t.Errorf("Ease after grade 0 = %.2f; want < %.2f", c2.Ease, DefaultEase)
		}
	})

	t.Run("ease clamps at max", func(t *testing.T) {
		card := newTestCard()
		card.Ease = MaxEase
		c1 := s.GradeCard(card, 3, now)
		if c1.Ease > MaxEase {
			t.Errorf("Ease = %.2f; want <= %.2f", c1.Ease, MaxEase)
		}
	})

	t.Run("interval caps at max", func(t *testing.T) {
		card := newTestCard()
		card.Interval = 1000
		card.Ease = MaxEase
		c1 := s.GradeCard(card, 3, now)
		if c1.Interval > MaxInterval {
			t.Errorf("Interval = %d; want <= %d", c1.Interval, MaxInterval)
		}
	})
}

func TestIsDue(t *testing.T) {
	s := NewSRSService()
	now := time.Now()

	due := &models.SrsCard{DueDate: now.Add(-time.Minute)}
	if !s.IsDue(due) {
		t.Error("past due date should be due")
	}

	notDue := &models.SrsCard{DueDate: now.Add(time.Hour)}
	if s.IsDue(notDue) {
		t.Error("future due date should not be due")
	}
}

func TestCalculateCardStats(t *testing.T) {
	s := NewSRSService()
	now := time.Now()
	cards := []models.SrsCard{
		{TotalReviews: 0, Mastery: 0},                    // new + learning
		{TotalReviews: 1, DueDate: now.Add(-time.Hour), Mastery: 10}, // due + learning
		{TotalReviews: 2, DueDate: now.Add(time.Hour), Mastery: 50},  // review (not due)
		{TotalReviews: 3, DueDate: now.Add(-time.Hour), Mastery: 80}, // due + review
	}
	stats := s.CalculateCardStats(cards)
	if stats["total"] != 4 {
		t.Errorf("total = %d; want 4", stats["total"])
	}
	if stats["new"] != 1 {
		t.Errorf("new = %d; want 1", stats["new"])
	}
	if stats["due"] != 2 {
		t.Errorf("due = %d; want 2", stats["due"])
	}
	if stats["learning"] != 2 {
		t.Errorf("learning = %d; want 2", stats["learning"])
	}
	if stats["review"] != 2 {
		t.Errorf("review = %d; want 2", stats["review"])
	}
}

func round64(v float64) float64 {
	// small helper mirroring math.Round semantics for the SRS interval math
	if v < 0 {
		return -round64(-v)
	}
	floor := float64(int(v))
	if v-floor >= 0.5 {
		return floor + 1
	}
	return floor
}
