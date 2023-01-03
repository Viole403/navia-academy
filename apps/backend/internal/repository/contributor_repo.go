package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type ContributorRepository struct {
	pool database.DBPool
}

func NewContributorRepository(pool database.DBPool) *ContributorRepository {
	return &ContributorRepository{pool: pool}
}

func (r *ContributorRepository) GetActiveContributors(ctx context.Context, limit, offset int) ([]models.Contributor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, email, avatar, contributions, mandarin_level, portfolio, bio,
		       is_active, joined_at, user_id, created_at, updated_at
		FROM contributor WHERE is_active = true
		ORDER BY joined_at DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contributors []models.Contributor
	for rows.Next() {
		var c models.Contributor
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Avatar, &c.Contributions,
			&c.MandarinLevel, &c.Portfolio, &c.Bio, &c.IsActive, &c.JoinedAt,
			&c.UserID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contributors = append(contributors, c)
	}
	return contributors, nil
}

func (r *ContributorRepository) GetByID(ctx context.Context, id string) (*models.Contributor, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, avatar, contributions, mandarin_level, portfolio, bio,
		       is_active, joined_at, user_id, created_at, updated_at
		FROM contributor WHERE id = $1
	`, id)

	c := &models.Contributor{}
	err := row.Scan(&c.ID, &c.Name, &c.Email, &c.Avatar, &c.Contributions,
		&c.MandarinLevel, &c.Portfolio, &c.Bio, &c.IsActive, &c.JoinedAt,
		&c.UserID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *ContributorRepository) Update(ctx context.Context, c *models.Contributor) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE contributor SET name=$1, avatar=$2, contributions=$3, mandarin_level=$4,
		                       portfolio=$5, bio=$6, is_active=$7, updated_at=NOW()
		WHERE id=$8
	`, c.Name, c.Avatar, c.Contributions, c.MandarinLevel, c.Portfolio, c.Bio, c.IsActive, c.ID)
	return err
}

func (r *ContributorRepository) Deactivate(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE contributor SET is_active=false, updated_at=NOW() WHERE id=$1`, id)
	return err
}

// Sponsor
func (r *ContributorRepository) GetActiveSponsors(ctx context.Context) ([]models.Sponsor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, logo, website, tier, description, is_active, started_at, ended_at,
		       contact_email, created_at, updated_at
		FROM sponsor WHERE is_active = true
		ORDER BY
			CASE tier
				WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
				WHEN 'Silver' THEN 2 WHEN 'Bronze' THEN 3 ELSE 4
			END, started_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sponsors []models.Sponsor
	for rows.Next() {
		var s models.Sponsor
		if err := rows.Scan(&s.ID, &s.Name, &s.Logo, &s.Website, &s.Tier, &s.Description,
			&s.IsActive, &s.StartedAt, &s.EndedAt, &s.ContactEmail, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sponsors = append(sponsors, s)
	}
	return sponsors, nil
}

func (r *ContributorRepository) CreateSponsor(ctx context.Context, s *models.Sponsor) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO sponsor (id, name, logo, website, tier, description, contact_email)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, s.ID, s.Name, s.Logo, s.Website, s.Tier, s.Description, s.ContactEmail)
	return err
}

func (r *ContributorRepository) GetSponsorByID(ctx context.Context, id string) (*models.Sponsor, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, name, logo, website, tier, description, is_active, started_at, ended_at,
		       contact_email, created_at, updated_at
		FROM sponsor WHERE id = $1
	`, id)

	s := &models.Sponsor{}
	err := row.Scan(&s.ID, &s.Name, &s.Logo, &s.Website, &s.Tier, &s.Description,
		&s.IsActive, &s.StartedAt, &s.EndedAt, &s.ContactEmail, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *ContributorRepository) UpdateSponsor(ctx context.Context, s *models.Sponsor) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sponsor SET name=$1, logo=$2, website=$3, tier=$4, description=$5,
		                   contact_email=$6, is_active=$7, ended_at=$8, updated_at=NOW()
		WHERE id=$9
	`, s.Name, s.Logo, s.Website, s.Tier, s.Description, s.ContactEmail, s.IsActive, s.EndedAt, s.ID)
	return err
}

func (r *ContributorRepository) DeactivateSponsor(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE sponsor SET is_active=false, updated_at=NOW() WHERE id=$1`, id)
	return err
}

// Applications
func (r *ContributorRepository) GetContributorApplications(ctx context.Context) ([]models.ContributorApplication, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, email, contribution_area, mandarin_level, portfolio, message,
		       status, reviewed_by, reviewed_at, created_at, updated_at
		FROM contributor_application ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []models.ContributorApplication
	for rows.Next() {
		var a models.ContributorApplication
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.ContributionArea, &a.MandarinLevel,
			&a.Portfolio, &a.Message, &a.Status, &a.ReviewedBy, &a.ReviewedAt,
			&a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, nil
}

func (r *ContributorRepository) CreateContributorApplication(ctx context.Context, a *models.ContributorApplication) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO contributor_application (id, name, email, contribution_area, mandarin_level,
		                                     portfolio, message)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, a.ID, a.Name, a.Email, a.ContributionArea, a.MandarinLevel, a.Portfolio, a.Message)
	return err
}

func (r *ContributorRepository) ReviewContributorApplication(ctx context.Context, id, status, reviewedBy string) (*models.ContributorApplication, error) {
	_, err := r.pool.Exec(ctx, `
		UPDATE contributor_application SET status=$1, reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
		WHERE id=$3
	`, status, reviewedBy, id)
	if err != nil {
		return nil, err
	}

	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, contribution_area, mandarin_level, portfolio, message,
		       status, reviewed_by, reviewed_at, created_at, updated_at
		FROM contributor_application WHERE id = $1
	`, id)

	a := &models.ContributorApplication{}
	err = row.Scan(&a.ID, &a.Name, &a.Email, &a.ContributionArea, &a.MandarinLevel,
		&a.Portfolio, &a.Message, &a.Status, &a.ReviewedBy, &a.ReviewedAt,
		&a.CreatedAt, &a.UpdatedAt)
	return a, err
}

func (r *ContributorRepository) GetSponsorApplications(ctx context.Context) ([]models.SponsorApplication, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, company_name, email, website, message, tier_interest,
		       status, reviewed_by, reviewed_at, created_at, updated_at
		FROM sponsor_application ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []models.SponsorApplication
	for rows.Next() {
		var a models.SponsorApplication
		if err := rows.Scan(&a.ID, &a.CompanyName, &a.Email, &a.Website, &a.Message,
			&a.TierInterest, &a.Status, &a.ReviewedBy, &a.ReviewedAt,
			&a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, nil
}

func (r *ContributorRepository) CreateSponsorApplication(ctx context.Context, a *models.SponsorApplication) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO sponsor_application (id, company_name, email, website, message, tier_interest)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, a.ID, a.CompanyName, a.Email, a.Website, a.Message, a.TierInterest)
	return err
}

func (r *ContributorRepository) CreateContributorFromApplication(ctx context.Context, app *models.ContributorApplication) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO contributor (id, name, email, contributions, mandarin_level, portfolio)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, "contrib-"+app.ID, app.Name, app.Email, []string{app.ContributionArea}, app.MandarinLevel, app.Portfolio)
	return err
}
