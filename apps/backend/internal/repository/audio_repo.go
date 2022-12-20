package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type AudioRepository struct {
	pool database.DBPool
}

func NewAudioRepository(pool database.DBPool) *AudioRepository {
	return &AudioRepository{pool: pool}
}

func (r *AudioRepository) FindByTextHash(ctx context.Context, textHash string) (*models.AudioRecord, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, text_hash, text, locale, gender, url, provider, created_at
		FROM audio_cache WHERE text_hash = $1
	`, textHash)

	a := &models.AudioRecord{}
	err := row.Scan(&a.ID, &a.TextHash, &a.Text, &a.Locale, &a.Gender, &a.URL, &a.Provider, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *AudioRepository) GetCacheStats(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audio_cache`).Scan(&count)
	return count, err
}

func (r *AudioRepository) GetTotalAudioCount(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audio_cache`).Scan(&count)
	return count, err
}

func (r *AudioRepository) Save(ctx context.Context, a *models.AudioRecord) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO audio_cache (id, text_hash, text, locale, gender, url, provider)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (text_hash) DO NOTHING
	`, a.ID, a.TextHash, a.Text, a.Locale, a.Gender, a.URL, a.Provider)
	return err
}
