package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type TestimonialRepository struct {
	pool database.DBPool
}

func NewTestimonialRepository(pool database.DBPool) *TestimonialRepository {
	return &TestimonialRepository{pool: pool}
}

// GetApproved returns APPROVED testimonials, newest first.
func (r *TestimonialRepository) GetApproved(ctx context.Context, limit int) ([]models.Testimonial, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, role_label, quote, avatar, status
		FROM testimonial
		WHERE status = 'APPROVED'
		ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Testimonial
	for rows.Next() {
		var t models.Testimonial
		if err := rows.Scan(&t.ID, &t.Name, &t.RoleLabel, &t.Quote, &t.Avatar, &t.Status); err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, nil
}

func (r *TestimonialRepository) Create(ctx context.Context, t *models.Testimonial) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO testimonial (id, name, role_label, quote, avatar, status)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, t.ID, t.Name, t.RoleLabel, t.Quote, t.Avatar, t.Status)
	return err
}

// ListAll returns testimonials ordered newest first, optionally filtered by
// status ("" = all statuses).
func (r *TestimonialRepository) ListAll(ctx context.Context, status string) ([]models.Testimonial, error) {
	query := `SELECT id, name, role_label, quote, avatar, status FROM testimonial`
	args := []interface{}{}
	if status != "" {
		query += ` WHERE status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Testimonial
	for rows.Next() {
		var t models.Testimonial
		if err := rows.Scan(&t.ID, &t.Name, &t.RoleLabel, &t.Quote, &t.Avatar, &t.Status); err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, nil
}

func (r *TestimonialRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE testimonial SET status=$1, reviewed_at=NOW(), updated_at=NOW()
		WHERE id=$2
	`, status, id)
	return err
}

func (r *TestimonialRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM testimonial WHERE id=$1`, id)
	return err
}
