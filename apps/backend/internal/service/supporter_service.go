package service

import (
	"context"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type SupporterService struct {
	supporterRepo *repository.SupporterRepository
}

func NewSupporterService(supporterRepo *repository.SupporterRepository) *SupporterService {
	return &SupporterService{supporterRepo: supporterRepo}
}

func (s *SupporterService) Upsert(ctx context.Context, supporter *models.Supporter) error {
	return s.supporterRepo.Upsert(ctx, supporter)
}

func (s *SupporterService) ListPublic(ctx context.Context, limit, offset int) ([]models.PublicSupporter, error) {
	supporters, err := s.supporterRepo.ListPublic(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	public := make([]models.PublicSupporter, len(supporters))
	for i, s := range supporters {
		public[i] = s.Public()
	}
	return public, nil
}

func (s *SupporterService) ListAll(ctx context.Context, limit, offset int) ([]models.Supporter, error) {
	return s.supporterRepo.ListAll(ctx, limit, offset)
}