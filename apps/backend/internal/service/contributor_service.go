package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type ContributorService struct {
	contributorRepo *repository.ContributorRepository
}

func NewContributorService(contributorRepo *repository.ContributorRepository) *ContributorService {
	return &ContributorService{contributorRepo: contributorRepo}
}

func (s *ContributorService) GetContributors(ctx context.Context, limit, offset int) ([]models.Contributor, error) {
	return s.contributorRepo.GetActiveContributors(ctx, limit, offset)
}

func (s *ContributorService) GetContributorByID(ctx context.Context, id string) (*models.Contributor, error) {
	return s.contributorRepo.GetByID(ctx, id)
}

func (s *ContributorService) UpdateContributor(ctx context.Context, id string, req map[string]interface{}) error {
	contributor, err := s.contributorRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if v, ok := req["name"].(string); ok {
		contributor.Name = v
	}
	if v, ok := req["avatar"].(string); ok {
		contributor.Avatar = &v
	}
	if v, ok := req["contributions"].([]interface{}); ok {
		contribs := make([]string, len(v))
		for i, c := range v {
			contribs[i] = c.(string)
		}
		contributor.Contributions = contribs
	}
	if v, ok := req["mandarin_level"].(string); ok {
		contributor.MandarinLevel = &v
	}
	if v, ok := req["portfolio"].(string); ok {
		contributor.Portfolio = &v
	}
	if v, ok := req["bio"].(string); ok {
		contributor.Bio = &v
	}
	if v, ok := req["is_active"].(bool); ok {
		contributor.IsActive = v
	}

	return s.contributorRepo.Update(ctx, contributor)
}

func (s *ContributorService) DeleteContributor(ctx context.Context, id string) error {
	return s.contributorRepo.Deactivate(ctx, id)
}

func (s *ContributorService) GetSponsors(ctx context.Context) ([]models.Sponsor, error) {
	return s.contributorRepo.GetActiveSponsors(ctx)
}

func (s *ContributorService) CreateSponsor(ctx context.Context, req models.CreateSponsorRequest) (*models.Sponsor, error) {
	sponsor := &models.Sponsor{
		ID:           "sponsor-" + uuid.New().String()[:8],
		Name:         req.Name,
		Logo:         req.Logo,
		Website:      req.Website,
		Tier:         req.Tier,
		Description:  req.Description,
		ContactEmail: req.ContactEmail,
	}

	if err := s.contributorRepo.CreateSponsor(ctx, sponsor); err != nil {
		return nil, err
	}

	return sponsor, nil
}

func (s *ContributorService) GetSponsorByID(ctx context.Context, id string) (*models.Sponsor, error) {
	return s.contributorRepo.GetSponsorByID(ctx, id)
}

func (s *ContributorService) UpdateSponsor(ctx context.Context, id string, req map[string]interface{}) error {
	sponsor, err := s.contributorRepo.GetSponsorByID(ctx, id)
	if err != nil {
		return err
	}

	if v, ok := req["name"].(string); ok {
		sponsor.Name = v
	}
	if v, ok := req["logo"].(string); ok {
		sponsor.Logo = &v
	}
	if v, ok := req["tier"].(string); ok {
		sponsor.Tier = &v
	}
	if v, ok := req["website"].(string); ok {
		sponsor.Website = &v
	}
	if v, ok := req["description"].(string); ok {
		sponsor.Description = &v
	}
	if v, ok := req["contactEmail"].(string); ok {
		sponsor.ContactEmail = &v
	}
	if v, ok := req["isActive"].(bool); ok {
		sponsor.IsActive = v
	}

	return s.contributorRepo.UpdateSponsor(ctx, sponsor)
}

func (s *ContributorService) DeleteSponsor(ctx context.Context, id string) error {
	return s.contributorRepo.DeactivateSponsor(ctx, id)
}

func (s *ContributorService) GetContributorApplications(ctx context.Context) ([]models.ContributorApplication, error) {
	return s.contributorRepo.GetContributorApplications(ctx)
}

func (s *ContributorService) ApplyContributor(ctx context.Context, req models.CreateContributorApplicationRequest) (*models.ContributorApplication, error) {
	app := &models.ContributorApplication{
		ID:              "contrib-app-" + uuid.New().String()[:8],
		Name:            req.Name,
		Email:           req.Email,
		ContributionArea: req.ContributionArea,
		MandarinLevel:   req.MandarinLevel,
		Portfolio:       req.Portfolio,
		Message:         req.Message,
		Status:          "PENDING",
	}

	if err := s.contributorRepo.CreateContributorApplication(ctx, app); err != nil {
		return nil, err
	}

	return app, nil
}

func (s *ContributorService) ReviewContributorApplication(ctx context.Context, id, status, reviewedBy string) (*models.ContributorApplication, error) {
	if status != "APPROVED" && status != "REJECTED" {
		return nil, errors.New("status must be APPROVED or REJECTED")
	}

	app, err := s.contributorRepo.ReviewContributorApplication(ctx, id, status, reviewedBy)
	if err != nil {
		return nil, err
	}

	if status == "APPROVED" {
		if err := s.contributorRepo.CreateContributorFromApplication(ctx, app); err != nil {
			return nil, err
		}
	}

	return app, nil
}

func (s *ContributorService) GetSponsorApplications(ctx context.Context) ([]models.SponsorApplication, error) {
	return s.contributorRepo.GetSponsorApplications(ctx)
}

func (s *ContributorService) ApplySponsor(ctx context.Context, req models.CreateSponsorApplicationRequest) (*models.SponsorApplication, error) {
	app := &models.SponsorApplication{
		ID:           "sponsor-app-" + uuid.New().String()[:8],
		CompanyName:  req.CompanyName,
		Email:        req.Email,
		Website:      req.Website,
		Message:      req.Message,
		TierInterest: req.TierInterest,
		Status:       "PENDING",
	}

	if err := s.contributorRepo.CreateSponsorApplication(ctx, app); err != nil {
		return nil, err
	}

	return app, nil
}
