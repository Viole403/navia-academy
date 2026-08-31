package repository

import (
	"context"
	"time"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type TaskRepository struct {
	pool database.DBPool
}

func NewTaskRepository(pool database.DBPool) *TaskRepository {
	return &TaskRepository{pool: pool}
}

func (r *TaskRepository) CreateTask(ctx context.Context, t *models.Task) error {
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now
	_, err := r.pool.Exec(ctx, `
		INSERT INTO task (id, user_id, content, completed, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, t.ID, t.UserID, t.Content, t.Completed, t.DueDate, t.CreatedAt, t.UpdatedAt)
	return err
}

func (r *TaskRepository) UpdateTask(ctx context.Context, t *models.Task) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE task SET content = $1, completed = $2, due_date = $3, updated_at = $4
		WHERE id = $5 AND user_id = $6
	`, t.Content, t.Completed, t.DueDate, time.Now(), t.ID, t.UserID)
	return err
}

func (r *TaskRepository) DeleteTask(ctx context.Context, id, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM task WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *TaskRepository) GetTasks(ctx context.Context, userID string) ([]models.Task, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, content, completed, due_date, created_at, updated_at
		FROM task WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.UserID, &t.Content, &t.Completed, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}
