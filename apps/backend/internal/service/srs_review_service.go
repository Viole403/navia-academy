package service

import (
	"context"
	"time"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type SRSReviewService struct {
	srsRepo *repository.SRSRepository
	srsSvc  *SRSService
}

func NewSRSReviewService(srsRepo *repository.SRSRepository, srsSvc *SRSService) *SRSReviewService {
	return &SRSReviewService{srsRepo: srsRepo, srsSvc: srsSvc}
}

func (s *SRSReviewService) GetDueCards(ctx context.Context, userID string, limit int) ([]models.SrsCard, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return s.srsRepo.GetDueCards(ctx, userID, limit)
}

func (s *SRSReviewService) ReviewCard(ctx context.Context, userID string, req models.SRSReviewRequest) (*models.SrsCard, error) {
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

func (s *SRSReviewService) CreateCard(ctx context.Context, userID, itemID, kind string) (*models.SrsCard, error) {
	return s.srsRepo.CreateCardForNewItem(ctx, userID, itemID, kind)
}

func (s *SRSReviewService) GetStats(ctx context.Context, userID string) (map[string]int, error) {
	dueCount, _ := s.srsRepo.GetDueCount(ctx, userID)
	stats, err := s.srsRepo.GetCardStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	stats["due"] = dueCount
	return stats, nil
}
