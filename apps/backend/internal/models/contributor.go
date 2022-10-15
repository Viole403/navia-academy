package models

import (
	"time"
)

type Contributor struct {
	ID            string    `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Email         string    `json:"email" db:"email"`
	Avatar        *string   `json:"avatar,omitempty" db:"avatar"`
	Contributions []string  `json:"contributions" db:"contributions"`
	MandarinLevel *string   `json:"mandarin_level,omitempty" db:"mandarin_level"`
	Portfolio     *string   `json:"portfolio,omitempty" db:"portfolio"`
	Bio           *string   `json:"bio,omitempty" db:"bio"`
	IsActive      bool      `json:"is_active" db:"is_active"`
	JoinedAt      time.Time `json:"joined_at" db:"joined_at"`
	UserID        *string   `json:"user_id,omitempty" db:"user_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type Sponsor struct {
	ID           string     `json:"id" db:"id"`
	Name         string     `json:"name" db:"name"`
	Logo         *string    `json:"logo,omitempty" db:"logo"`
	Website      *string    `json:"website,omitempty" db:"website"`
	Tier         *string    `json:"tier,omitempty" db:"tier"`
	Description  *string    `json:"description,omitempty" db:"description"`
	IsActive     bool       `json:"is_active" db:"is_active"`
	StartedAt    time.Time  `json:"started_at" db:"started_at"`
	EndedAt      *time.Time `json:"ended_at,omitempty" db:"ended_at"`
	ContactEmail *string    `json:"contact_email,omitempty" db:"contact_email"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type ContributorApplication struct {
	ID              string     `json:"id" db:"id"`
	Name            string     `json:"name" db:"name"`
	Email           string     `json:"email" db:"email"`
	ContributionArea string    `json:"contribution_area" db:"contribution_area"`
	MandarinLevel   *string    `json:"mandarin_level,omitempty" db:"mandarin_level"`
	Portfolio       *string    `json:"portfolio,omitempty" db:"portfolio"`
	Message         *string    `json:"message,omitempty" db:"message"`
	Status          string     `json:"status" db:"status"`
	ReviewedBy      *string    `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

type SponsorApplication struct {
	ID           string     `json:"id" db:"id"`
	CompanyName  string     `json:"company_name" db:"company_name"`
	Email        string     `json:"email" db:"email"`
	Website      *string    `json:"website,omitempty" db:"website"`
	Message      *string    `json:"message,omitempty" db:"message"`
	TierInterest *string    `json:"tier_interest,omitempty" db:"tier_interest"`
	Status       string     `json:"status" db:"status"`
	ReviewedBy   *string    `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateSponsorRequest struct {
	Name         string  `json:"name" validate:"required"`
	Logo         *string `json:"logo,omitempty"`
	Tier         *string `json:"tier,omitempty"`
	Website      *string `json:"website,omitempty"`
	Description  *string `json:"description,omitempty"`
	ContactEmail *string `json:"contact_email,omitempty"`
}

type CreateContributorApplicationRequest struct {
	Name            string  `json:"name" validate:"required"`
	Email           string  `json:"email" validate:"required,email"`
	ContributionArea string `json:"contribution_area" validate:"required"`
	MandarinLevel   *string `json:"mandarin_level,omitempty"`
	Portfolio       *string `json:"portfolio,omitempty"`
	Message         *string `json:"message,omitempty"`
}

type CreateSponsorApplicationRequest struct {
	CompanyName  string  `json:"company_name" validate:"required"`
	Email        string  `json:"email" validate:"required,email"`
	Website      *string `json:"website,omitempty"`
	Message      *string `json:"message,omitempty"`
	TierInterest *string `json:"tier_interest,omitempty"`
}

type ReviewApplicationRequest struct {
	Status     string `json:"status" validate:"required,oneof=APPROVED REJECTED"`
	ReviewedBy string `json:"reviewed_by" validate:"required"`
}
