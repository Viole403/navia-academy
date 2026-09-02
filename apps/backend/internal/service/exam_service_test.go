package service

import (
	"math"
	"testing"

	"github.com/navia-academy/backend/internal/models"
)

func TestEloUpdate(t *testing.T) {
	tests := []struct {
		name              string
		theta, itemElo    float64
		correct           bool
		questionsAnswered int
		// we just check that the result is within a reasonable range and
		// moves in the expected direction — exact values are deterministic.
		wantIncrease bool
	}{
		{"correct vs much easier item → theta rises", 550, 400, true, 0, true},
		{"wrong vs much harder item → theta drops", 550, 700, false, 0, false},
		{"correct vs equal item → small rise", 550, 550, true, 0, true},
		{"wrong vs equal item → small drop", 550, 550, false, 0, false},
		{"late in session → K smaller, change muted", 550, 550, true, 15, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := eloUpdate(tt.theta, tt.itemElo, tt.correct, tt.questionsAnswered)
			if tt.wantIncrease && got <= tt.theta {
				t.Errorf("eloUpdate(%.0f, %.0f, %v, %d) = %.2f; want > %.0f",
					tt.theta, tt.itemElo, tt.correct, tt.questionsAnswered, got, tt.theta)
			}
			if !tt.wantIncrease && got >= tt.theta {
				t.Errorf("eloUpdate(%.0f, %.0f, %v, %d) = %.2f; want < %.0f",
					tt.theta, tt.itemElo, tt.correct, tt.questionsAnswered, got, tt.theta)
			}
			// K-factor decay: late questions should have smaller |delta|
			if tt.questionsAnswered >= 15 {
				delta := math.Abs(got - tt.theta)
				if delta > 20 {
					t.Errorf("K decay too large: |delta| = %.2f, want < 20", delta)
				}
			}
		})
	}
}

func TestRecomputeCatRating(t *testing.T) {
	// Single correct answer, itemElo=550, startTheta=0 (defaults to 550)
	answers := []models.CatAnswer{{ItemID: "w1", ItemElo: 550, Correct: true, Format: "meaning"}}
	elo, correct, total := recomputeCatRating(answers, 0)
	if total != 1 {
		t.Errorf("total = %d; want 1", total)
	}
	if correct != 1 {
		t.Errorf("correct = %d; want 1", correct)
	}
	if elo <= 550 {
		t.Errorf("elo = %.2f; want > 550 (correct answer should raise rating)", elo)
	}

	// With startTheta explicitly set
	elo2, correct2, total2 := recomputeCatRating(answers, 850)
	if total2 != 1 || correct2 != 1 {
		t.Errorf("total/correct mismatch")
	}
	if elo2 <= 850 {
		t.Errorf("elo = %.2f; want > 850 when starting at 850", elo2)
	}
}

func TestCefrBandOf(t *testing.T) {
	tests := []struct {
		elo  float64
		want string
	}{
		{0, "A1"},
		{699, "A1"},
		{700, "A2"},
		{999, "A2"},
		{1000, "B1"},
		{1299, "B1"},
		{1300, "B2"},
		{1699, "B2"},
		{1700, "C1"},
		{1999, "C1"},
		{2000, "C2"},
		{9999, "C2"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := cefrBandOf(tt.elo); got != tt.want {
				t.Errorf("cefrBandOf(%.0f) = %q; want %q", tt.elo, got, tt.want)
			}
		})
	}
}