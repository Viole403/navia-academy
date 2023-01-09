package repository

import (
	"context"
	"time"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type SRSRepository struct {
	pool database.DBPool
}

func NewSRSRepository(pool database.DBPool) *SRSRepository {
	return &SRSRepository{pool: pool}
}

func (r *SRSRepository) GetCard(ctx context.Context, userID, itemID string) (*models.SrsCard, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, item_id, kind, mastery, "interval", ease, due_date,
		       total_reviews, correct_streak, last_review, created_at, updated_at
		FROM srs_card WHERE user_id = $1 AND item_id = $2
	`, userID, itemID)

	c := &models.SrsCard{}
	err := row.Scan(&c.ID, &c.UserID, &c.ItemID, &c.Kind, &c.Mastery, &c.Interval, &c.Ease,
		&c.DueDate, &c.TotalReviews, &c.CorrectStreak, &c.LastReview, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *SRSRepository) UpsertCard(ctx context.Context, c *models.SrsCard) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO srs_card (id, user_id, item_id, kind, mastery, "interval", ease, due_date,
		                      total_reviews, correct_streak, last_review, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
		ON CONFLICT (id) DO UPDATE SET
			mastery = EXCLUDED.mastery, "interval" = EXCLUDED."interval", ease = EXCLUDED.ease,
			due_date = EXCLUDED.due_date, total_reviews = EXCLUDED.total_reviews,
			correct_streak = EXCLUDED.correct_streak, last_review = EXCLUDED.last_review,
			updated_at = NOW()
	`, c.ID, c.UserID, c.ItemID, c.Kind, c.Mastery, c.Interval, c.Ease, c.DueDate,
		c.TotalReviews, c.CorrectStreak, c.LastReview, c.CreatedAt)
	return err
}

func (r *SRSRepository) GetDueCards(ctx context.Context, userID string, limit int) ([]models.SrsCard, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, item_id, kind, mastery, "interval", ease, due_date,
		       total_reviews, correct_streak, last_review, created_at, updated_at
		FROM srs_card WHERE user_id = $1 AND due_date <= NOW()
		ORDER BY due_date ASC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []models.SrsCard
	for rows.Next() {
		var c models.SrsCard
		if err := rows.Scan(&c.ID, &c.UserID, &c.ItemID, &c.Kind, &c.Mastery, &c.Interval, &c.Ease,
			&c.DueDate, &c.TotalReviews, &c.CorrectStreak, &c.LastReview, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cards = append(cards, c)
	}
	return cards, nil
}

func (r *SRSRepository) GetCardsByItemIDs(ctx context.Context, userID string, itemIDs []string) (map[string]*models.SrsCard, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, item_id, kind, mastery, "interval", ease, due_date,
		       total_reviews, correct_streak, last_review, created_at, updated_at
		FROM srs_card WHERE user_id = $1 AND item_id = ANY($2)
	`, userID, itemIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cards := make(map[string]*models.SrsCard)
	for rows.Next() {
		var c models.SrsCard
		if err := rows.Scan(&c.ID, &c.UserID, &c.ItemID, &c.Kind, &c.Mastery, &c.Interval, &c.Ease,
			&c.DueDate, &c.TotalReviews, &c.CorrectStreak, &c.LastReview, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cards[c.ItemID] = &c
	}
	return cards, nil
}

func (r *SRSRepository) GetDueCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM srs_card WHERE user_id = $1 AND due_date <= NOW()
	`, userID).Scan(&count)
	return count, err
}

func (r *SRSRepository) GetCardStats(ctx context.Context, userID string) (map[string]int, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT kind, COUNT(*) FROM srs_card WHERE user_id = $1 GROUP BY kind
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make(map[string]int)
	for rows.Next() {
		var kind string
		var count int
		if err := rows.Scan(&kind, &count); err != nil {
			return nil, err
		}
		stats[kind] = count
	}
	return stats, nil
}

func (r *SRSRepository) CreateCardForNewItem(ctx context.Context, userID, itemID, kind string) (*models.SrsCard, error) {
	now := time.Now()
	cardID := "srs-" + userID + "-" + itemID

	_, err := r.pool.Exec(ctx, `
		INSERT INTO srs_card (id, user_id, item_id, kind, mastery, "interval", ease, due_date,
		                      total_reviews, correct_streak, created_at, updated_at)
		VALUES ($1,$2,$3,$4,0,0,2.5,$5,0,0,$6,$6)
		ON CONFLICT (id) DO NOTHING
	`, cardID, userID, itemID, kind, now, now)
	if err != nil {
		return nil, err
	}

	return r.GetCard(ctx, userID, itemID)
}
