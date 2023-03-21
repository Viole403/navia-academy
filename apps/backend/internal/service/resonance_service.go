package service

import (
	"context"
	"errors"
	"strings"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

var (
	ErrResonanceInvalidOrigin  = errors.New("origin must be a single writing-system symbol (max 8 chars)")
	ErrResonanceInvalidEmotion = errors.New("invalid emotion; allowed: inspired, warm, curious, nostalgic, calm, excited")
)

// ResonanceService combines the all-time (violet) and 24h pulse (turquoise)
// sides of an origin's emotional resonance.
type ResonanceService struct {
	repo *repository.ResonanceRepository
}

func NewResonanceService(repo *repository.ResonanceRepository) *ResonanceService {
	return &ResonanceService{repo: repo}
}

func validOrigin(origin string) bool {
	origin = strings.TrimSpace(origin)
	if origin == "" || len([]rune(origin)) > 8 {
		return false
	}
	// allow hanzi radicals, kana/kanji, Latin words and markers like "char:c"
	return true
}

// Add records one reaction. Aliases are normalized to the defined set.
func (s *ResonanceService) Add(ctx context.Context, e models.ResonanceEvent, userID string) (*models.ResonanceOrigin, error) {
	origin := strings.TrimSpace(e.Origin)
	if !validOrigin(origin) {
		return nil, ErrResonanceInvalidOrigin
	}
	emotion, ok := models.NormalizeResonanceEmotion(strings.ToLower(strings.TrimSpace(e.Emotion)))
	if !ok {
		return nil, ErrResonanceInvalidEmotion
	}
	intensity := e.Intensity
	if intensity < 1 || intensity > 3 {
		intensity = 1
	}
	if err := s.repo.Create(ctx, models.ResonanceEvent{Origin: origin, Emotion: emotion}, userID, intensity); err != nil {
		return nil, err
	}
	return s.Get(ctx, origin)
}

// Get returns the aggregated resonance for one origin.
func (s *ResonanceService) Get(ctx context.Context, origin string) (*models.ResonanceOrigin, error) {
	origin = strings.TrimSpace(origin)
	if !validOrigin(origin) {
		return nil, ErrResonanceInvalidOrigin
	}
	total, err := s.repo.Totals(ctx, origin)
	if err != nil {
		return nil, err
	}
	live, err := s.repo.Live(ctx, origin)
	if err != nil {
		return nil, err
	}
	return &models.ResonanceOrigin{Origin: origin, Total: total, Live: live}, nil
}

// Hot returns the top origins by 24h live pulse.
func (s *ResonanceService) Hot(ctx context.Context, limit int) ([]models.ResonanceHot, error) {
	if limit <= 0 || limit > 25 {
		limit = 8
	}
	hot, err := s.repo.Hot(ctx, limit)
	if err != nil {
		return nil, err
	}
	return hot, nil
}

// MyReactions returns the user's last reactions so the UI can re-highlight them.
func (s *ResonanceService) MyReactions(ctx context.Context, userID string, limit int) ([]models.ResonanceReaction, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	return s.repo.RecentByUser(ctx, userID, limit)
}