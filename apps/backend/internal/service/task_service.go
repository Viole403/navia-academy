package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type TaskService struct {
	taskRepo *repository.TaskRepository
}

func NewTaskService(taskRepo *repository.TaskRepository) *TaskService {
	return &TaskService{taskRepo: taskRepo}
}

func (s *TaskService) CreateTask(ctx context.Context, userID, content string, dueDate *time.Time) (*models.Task, error) {
	task := &models.Task{
		ID:      uuid.New().String(),
		UserID:  userID,
		Content: content,
		DueDate: dueDate,
	}
	if err := s.taskRepo.CreateTask(ctx, task); err != nil {
		return nil, err
	}
	return task, nil
}

func (s *TaskService) UpdateTask(ctx context.Context, task *models.Task) error {
	return s.taskRepo.UpdateTask(ctx, task)
}

func (s *TaskService) DeleteTask(ctx context.Context, id, userID string) error {
	return s.taskRepo.DeleteTask(ctx, id, userID)
}

func (s *TaskService) GetTasks(ctx context.Context, userID string) ([]models.Task, error) {
	return s.taskRepo.GetTasks(ctx, userID)
}
