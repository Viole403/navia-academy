package models

import (
	"time"
)

type Testimonial struct {
	ID         string     `json:"id" db:"id"`
	Name       string     `json:"name" db:"name"`
	RoleLabel  *string    `json:"role_label,omitempty" db:"role_label"`
	Quote      string     `json:"quote" db:"quote"`
	Avatar     *string    `json:"avatar,omitempty" db:"avatar"`
	Status     string     `json:"status" db:"status"`
	UserID     *string    `json:"user_id,omitempty" db:"user_id"`
	ReviewedBy *string    `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateTestimonialRequest struct {
	Name      string `json:"name"`
	RoleLabel string `json:"role_label"`
	Quote     string `json:"quote"`
}

// ReviewTestimonialRequest mirrors ReviewApplicationRequest:
// Status must be APPROVED | REJECTED (PENDING is not a review outcome).
type ReviewTestimonialRequest struct {
	Status string `json:"status"`
}
