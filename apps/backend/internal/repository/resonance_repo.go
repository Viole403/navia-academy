package repository

import (
	"context"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

// ResonanceRepository persists emotional reactions to word origins.
type ResonanceRepository struct {
	pool database.DBPool
}

func NewResonanceRepository(pool database.DBPool) *ResonanceRepository {
	return &ResonanceRepository{pool: pool}
}

// Create inserts one reaction.
func (r *ResonanceRepository) Create(ctx context.Context, e models.ResonanceEvent, userID string, intensity int) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO resonance (origin, emotion, user_id, intensity)
		VALUES ($1, $2, $3, $4)
	`, e.Origin, e.Emotion, userID, intensity)
	return err
}

// Totals returns per-emotion all-time counts for one origin.
func (r *ResonanceRepository) Totals(ctx context.Context, origin string) (map[string]int64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT emotion, count(*) FROM resonance WHERE origin = $1 GROUP BY emotion
	`, origin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var emotion string
		var n int64
		if err := rows.Scan(&emotion, &n); err != nil {
			return nil, err
		}
		out[emotion] = n
	}
	return out, rows.Err()
}

// Live returns per-emotion counts within the 24h pulse window for one origin.
func (r *ResonanceRepository) Live(ctx context.Context, origin string) (map[string]int64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT emotion, count(*) FROM resonance
		WHERE origin = $1 AND created_at >= now() - interval '24 hours'
		GROUP BY emotion
	`, origin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var emotion string
		var n int64
		if err := rows.Scan(&emotion, &n); err != nil {
			return nil, err
		}
		out[emotion] = n
	}
	return out, rows.Err()
}

// Hot returns origins ranked by their live pulse within the last 24h.
func (r *ResonanceRepository) Hot(ctx context.Context, limit int) ([]models.ResonanceHot, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT origin,
		       count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS live,
		       count(*) AS total
		FROM resonance
		GROUP BY origin
		ORDER BY live DESC, total DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.ResonanceHot{}
	for rows.Next() {
		var h models.ResonanceHot
		if err := rows.Scan(&h.Origin, &h.Live, &h.Total); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

// RecentByUser returns the last reactions a user sent (to re-show their picks).
func (r *ResonanceRepository) RecentByUser(ctx context.Context, userID string, limit int) ([]models.ResonanceReaction, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, origin, emotion, user_id, intensity, created_at
		FROM resonance WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.ResonanceReaction{}
	for rows.Next() {
		var rc models.ResonanceReaction
		if err := rows.Scan(&rc.ID, &rc.Origin, &rc.Emotion, &rc.UserID, &rc.Intensity, &rc.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, rc)
	}
	return out, rows.Err()
}