package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type ProgressService struct {
	progressRepo *repository.ProgressRepository
}

func NewProgressService(progressRepo *repository.ProgressRepository) *ProgressService {
	return &ProgressService{progressRepo: progressRepo}
}

func (s *ProgressService) GetProgress(ctx context.Context, userID string) (*models.UserProgress, error) {
	progress, err := s.progressRepo.GetByUserID(ctx, userID)
	if err != nil {
		defaultOnboarding := json.RawMessage(`{"completed":false,"step":0}`)
		return &models.UserProgress{
			UserID:           userID,
			XP:               0,
			Streak:           0,
			BestStreak:       0,
			StartedAt:        time.Now(),
			Onboarding:       &defaultOnboarding,
			SavedWordIDs:     []string{},
			DifficultItemIDs: []string{},
		}, nil
	}
	return progress, nil
}

func (s *ProgressService) UpdateProgress(ctx context.Context, userID string, req models.ProgressUpdateRequest) error {
	existing, _ := s.progressRepo.GetByUserID(ctx, userID)
	if existing == nil {
		existing = &models.UserProgress{}
	}

	id := existing.ID
	if id == "" {
		id = uuid.New().String()
	}

	startedAt := time.Now()
	if !existing.StartedAt.IsZero() {
		startedAt = existing.StartedAt
	}
	if req.StartedAt != nil {
		if t, err := time.Parse(time.RFC3339, *req.StartedAt); err == nil {
			startedAt = t
		}
	}

	var lastStudyDate *time.Time
	if req.LastStudyDate != nil {
		if t, err := time.Parse(time.RFC3339, *req.LastStudyDate); err == nil {
			lastStudyDate = &t
		}
	}

	onboarding := existing.Onboarding
	if req.Onboarding != nil {
		onboarding = req.Onboarding
	}

	placement := existing.Placement
	if req.Placement != nil {
		placement = req.Placement
	}

	savedWordIDs := existing.SavedWordIDs
	if req.SavedWordIDs != nil {
		savedWordIDs = req.SavedWordIDs
	}

	difficultItemIDs := existing.DifficultItemIDs
	if req.DifficultItemIDs != nil {
		difficultItemIDs = req.DifficultItemIDs
	}

	data := existing.Data
	if req.Data != nil {
		data = req.Data
	}

	xp := existing.XP
	if req.XP != nil {
		xp = *req.XP
	}

	streak := existing.Streak
	if req.Streak != nil {
		streak = *req.Streak
	}

	bestStreak := existing.BestStreak
	if req.BestStreak != nil {
		bestStreak = *req.BestStreak
	}

	if savedWordIDs == nil {
		savedWordIDs = []string{}
	}
	if difficultItemIDs == nil {
		difficultItemIDs = []string{}
	}

	progress := &models.UserProgress{
		ID:               id,
		UserID:           userID,
		XP:               xp,
		Streak:           streak,
		BestStreak:       bestStreak,
		LastStudyDate:    lastStudyDate,
		StartedAt:        startedAt,
		Onboarding:       onboarding,
		Placement:        placement,
		SavedWordIDs:     savedWordIDs,
		DifficultItemIDs: difficultItemIDs,
		Data:             data,
	}

	return s.progressRepo.Upsert(ctx, progress)
}

func (s *ProgressService) LogStudySession(ctx context.Context, userID string, minutes, xp int) error {
	today := time.Now().UTC().Format("2006-01-02")
	session := &models.StudySession{
		ID:      uuid.New().String(),
		UserID:  userID,
		Date:    today,
		Minutes: minutes,
		XP:      xp,
	}
	return s.progressRepo.AddStudySession(ctx, session)
}

func (s *ProgressService) GetStudySessions(ctx context.Context, userID string, limit, offset int) ([]models.StudySession, error) {
	return s.progressRepo.GetStudySessions(ctx, userID, limit, offset)
}
