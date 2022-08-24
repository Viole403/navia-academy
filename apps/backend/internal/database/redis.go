package database

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/navia-academy/backend/internal/config"
)

func NewRedisClient(cfg config.RedisConfig) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	if cfg.Password != "" {
		opts.Password = cfg.Password
	}

	client := redis.NewClient(opts)

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}
