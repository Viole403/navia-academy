package service

import (
	"math"
	"time"

	"github.com/navia-academy/backend/internal/models"
)

const (
	MinEase      = 1.3
	DefaultEase  = 2.5
	MaxEase      = 3.0
	MaxInterval  = 365
	MasteryMax   = 100
)

type SRSService struct{}

func NewSRSService() *SRSService {
	return &SRSService{}
}

func (s *SRSService) NewCard(itemID, kind string) *models.SrsCard {
	now := time.Now()
	return &models.SrsCard{
		ItemID:        itemID,
		Kind:          kind,
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

func (s *SRSService) GradeCard(card *models.SrsCard, grade int, now time.Time) *models.SrsCard {
	ease := card.Ease
	interval := card.Interval
	repetitions := card.TotalReviews
	mastery := card.Mastery

	if grade == 0 {
		repetitions = 0
		interval = 0
		ease = math.Max(MinEase, ease-0.2)
		mastery = clamp(mastery-25, 0, MasteryMax)
		card.CorrectStreak = 0
	} else {
		repetitions++
		card.CorrectStreak++

		if grade == 1 {
			ease = math.Max(MinEase, ease-0.15)
			interval = int(math.Max(1, math.Round(float64(interval)*1.2)))
			mastery = clamp(mastery+5, 0, MasteryMax)
		} else if grade == 2 {
			if repetitions == 1 {
				interval = 1
			} else if repetitions == 2 {
				interval = 3
			} else {
				interval = int(math.Round(float64(interval) * ease))
			}
			mastery = clamp(mastery+12, 0, MasteryMax)
		} else {
			ease = math.Min(MaxEase, ease+0.1)
			if repetitions == 1 {
				interval = 2
			} else if repetitions == 2 {
				interval = 5
			} else {
				interval = int(math.Round(float64(interval) * ease * 1.3))
			}
			mastery = clamp(mastery+18, 0, MasteryMax)
		}
	}

	interval = int(math.Min(float64(interval), MaxInterval))

	dueDate := now.AddDate(0, 0, interval)
	if grade == 0 {
		dueDate = now
	}

	return &models.SrsCard{
		ID:            card.ID,
		UserID:        card.UserID,
		ItemID:        card.ItemID,
		Kind:          card.Kind,
		Mastery:       mastery,
		Interval:      interval,
		Ease:          ease,
		DueDate:       dueDate,
		TotalReviews:  repetitions,
		CorrectStreak: card.CorrectStreak,
		LastReview:    &now,
		CreatedAt:     card.CreatedAt,
		UpdatedAt:     now,
	}
}

func (s *SRSService) IsDue(card *models.SrsCard) bool {
	return !card.DueDate.After(time.Now())
}

func (s *SRSService) CalculateCardStats(cards []models.SrsCard) map[string]int {
	dueCount := 0
	newCount := 0
	learningCount := 0
	reviewCount := 0

	now := time.Now()
	for _, card := range cards {
		if card.TotalReviews == 0 {
			newCount++
		} else if card.DueDate.Before(now) || card.DueDate.Equal(now) {
			dueCount++
		}
		if card.Mastery < 30 {
			learningCount++
		} else {
			reviewCount++
		}
	}

	return map[string]int{
		"total":    len(cards),
		"due":      dueCount,
		"new":      newCount,
		"learning": learningCount,
		"review":   reviewCount,
	}
}

func clamp(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
