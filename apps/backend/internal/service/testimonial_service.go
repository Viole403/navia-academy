package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

var (
	ErrTestimonialValidation = errors.New("testimonial validation failed")
	ErrTestimonialBadStatus  = errors.New("invalid testimonial status")
)

type TestimonialService struct {
	testimonialRepo *repository.TestimonialRepository
}

func NewTestimonialService(testimonialRepo *repository.TestimonialRepository) *TestimonialService {
	return &TestimonialService{testimonialRepo: testimonialRepo}
}

// GetApproved serves the public landing endpoint. Default limit 9, max 24.
func (s *TestimonialService) GetApproved(ctx context.Context, limit int) ([]models.Testimonial, error) {
	if limit <= 0 {
		limit = 9
	}
	if limit > 24 {
		limit = 24
	}
	return s.testimonialRepo.GetApproved(ctx, limit)
}

// Submit stores a PENDING testimonial after length validation; it becomes
// public only after an admin approves it.
func (s *TestimonialService) Submit(ctx context.Context, req models.CreateTestimonialRequest) (*models.Testimonial, error) {
	name := strings.TrimSpace(req.Name)
	quote := strings.TrimSpace(req.Quote)
	roleLabel := strings.TrimSpace(req.RoleLabel)

	if len(name) < 2 || len(name) > 60 {
		return nil, ErrTestimonialValidation
	}
	if len(quote) < 10 || len(quote) > 280 {
		return nil, ErrTestimonialValidation
	}
	if len(roleLabel) > 60 {
		return nil, ErrTestimonialValidation
	}

	t := &models.Testimonial{
		ID:     "testi-" + uuid.New().String()[:8],
		Name:   name,
		Quote:  quote,
		Status: "PENDING",
	}
	if roleLabel != "" {
		t.RoleLabel = &roleLabel
	}

	if err := s.testimonialRepo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// ListAll supports the admin console; empty status returns every row.
func (s *TestimonialService) ListAll(ctx context.Context, status string) ([]models.Testimonial, error) {
	if status != "" && status != "PENDING" && status != "APPROVED" && status != "REJECTED" {
		return nil, ErrTestimonialBadStatus
	}
	return s.testimonialRepo.ListAll(ctx, status)
}

// Review sets APPROVED or REJECTED on a pending testimonial.
func (s *TestimonialService) Review(ctx context.Context, id string, req models.ReviewTestimonialRequest) error {
	if req.Status != "APPROVED" && req.Status != "REJECTED" {
		return ErrTestimonialBadStatus
	}
	return s.testimonialRepo.UpdateStatus(ctx, id, req.Status)
}

func (s *TestimonialService) Delete(ctx context.Context, id string) error {
	return s.testimonialRepo.Delete(ctx, id)
}
