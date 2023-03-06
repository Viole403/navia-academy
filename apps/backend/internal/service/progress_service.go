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
	srsRepo      *repository.SRSRepository
	srsSvc       *SRSService
}

func NewProgressService(progressRepo *repository.ProgressRepository, srsRepo *repository.SRSRepository, srsSvc *SRSService) *ProgressService {
	return &ProgressService{
		progressRepo: progressRepo,
		srsRepo:      srsRepo,
		srsSvc:       srsSvc,
	}
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

func (s *ProgressService) GetDueCards(ctx context.Context, userID string, limit int) ([]models.SrsCard, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return s.srsRepo.GetDueCards(ctx, userID, limit)
}

func (s *ProgressService) ReviewCard(ctx context.Context, userID string, req models.SRSReviewRequest) (*models.SrsCard, error) {
	card, err := s.srsRepo.GetCard(ctx, userID, req.ItemID)
	if err != nil {
		card = s.srsSvc.NewCard(req.ItemID, req.Kind)
		card.UserID = userID
		card.ID = "srs-" + userID + "-" + req.ItemID
		card.CreatedAt = time.Now()
	}

	updatedCard := s.srsSvc.GradeCard(card, req.Grade, time.Now())
	updatedCard.UserID = userID

	if err := s.srsRepo.UpsertCard(ctx, updatedCard); err != nil {
		return nil, err
	}

	return updatedCard, nil
}

func (s *ProgressService) GetAchievements(ctx context.Context, userID string) ([]models.Achievement, error) {
	return s.progressRepo.GetAchievements(ctx, userID)
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

func (s *ProgressService) CreateTask(ctx context.Context, userID, content string, dueDate *time.Time) (*models.Task, error) {
	task := &models.Task{
		ID:      uuid.New().String(),
		UserID:  userID,
		Content: content,
		DueDate: dueDate,
	}
	if err := s.progressRepo.CreateTask(ctx, task); err != nil {
		return nil, err
	}
	return task, nil
}

func (s *ProgressService) UpdateTask(ctx context.Context, task *models.Task) error {
	return s.progressRepo.UpdateTask(ctx, task)
}

func (s *ProgressService) DeleteTask(ctx context.Context, id, userID string) error {
	return s.progressRepo.DeleteTask(ctx, id, userID)
}

func (s *ProgressService) GetTasks(ctx context.Context, userID string) ([]models.Task, error) {
	return s.progressRepo.GetTasks(ctx, userID)
}

func (s *ProgressService) AddGameResult(ctx context.Context, userID, gameID string, accuracy float64, score int) error {
	result := &models.GameResult{
		ID:       uuid.New().String(),
		UserID:   userID,
		GameID:   gameID,
		Accuracy: accuracy,
		Score:    score,
		PlayedAt: time.Now(),
	}
	return s.progressRepo.AddGameResult(ctx, result)
}
