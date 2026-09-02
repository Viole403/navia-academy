package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type SupporterRepository struct {
	pool database.DBPool
}

func NewSupporterRepository(pool database.DBPool) *SupporterRepository {
	return &SupporterRepository{pool: pool}
}

func (r *SupporterRepository) Upsert(ctx context.Context, s *models.Supporter) error {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO supporter (name, avatar_url, platform, amount_minor, currency, message, is_public, external_id, donated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (external_id) DO UPDATE SET
			name = EXCLUDED.name,
			avatar_url = EXCLUDED.avatar_url,
			platform = EXCLUDED.platform,
			amount_minor = EXCLUDED.amount_minor,
			currency = EXCLUDED.currency,
			message = EXCLUDED.message,
			is_public = EXCLUDED.is_public,
			donated_at = EXCLUDED.donated_at
		RETURNING id
	`, s.Name, s.AvatarURL, s.Platform, s.AmountMinor, s.Currency, s.Message, s.IsPublic, s.ExternalID, s.DonatedAt).Scan(&s.ID)
	if err != nil {
		return err
	}
	return nil
}

func (r *SupporterRepository) ListPublic(ctx context.Context, limit, offset int) ([]models.Supporter, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, avatar_url, platform, amount_minor, currency, message, is_public, external_id, donated_at, created_at
		FROM supporter
		WHERE is_public = true
		ORDER BY donated_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var supporters []models.Supporter
	for rows.Next() {
		var s models.Supporter
		if err := rows.Scan(&s.ID, &s.Name, &s.AvatarURL, &s.Platform, &s.AmountMinor, &s.Currency,
			&s.Message, &s.IsPublic, &s.ExternalID, &s.DonatedAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		supporters = append(supporters, s)
	}
	return supporters, nil
}

func (r *SupporterRepository) ListAll(ctx context.Context, limit, offset int) ([]models.Supporter, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, avatar_url, platform, amount_minor, currency, message, is_public, external_id, donated_at, created_at
		FROM supporter
		ORDER BY donated_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var supporters []models.Supporter
	for rows.Next() {
		var s models.Supporter
		if err := rows.Scan(&s.ID, &s.Name, &s.AvatarURL, &s.Platform, &s.AmountMinor, &s.Currency,
			&s.Message, &s.IsPublic, &s.ExternalID, &s.DonatedAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		supporters = append(supporters, s)
	}
	return supporters, nil
}