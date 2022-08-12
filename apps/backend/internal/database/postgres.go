package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navia-academy/backend/internal/config"
)

// dbAcquireTimeout bounds how long a pool operation waits for a free
// connection. It is kept well under the Fiber WriteTimeout (30s) so pool
// saturation surfaces as a fast, clean failure instead of hanging until the
// server timeout kills the connection.
const dbAcquireTimeout = 8 * time.Second

// DBPool is the subset of *pgxpool.Pool that repositories depend on. It lets
// NewPostgresPool return a deadline-aware wrapper without changing repository
// call sites.
type DBPool interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// timedPool wraps *pgxpool.Pool and injects an acquire deadline when the
// caller's context carries none. pgx honours the deadline during connection
// acquisition, so a saturated pool fails fast instead of blocking.
type timedPool struct {
	*pgxpool.Pool
	acquireTimeout time.Duration
}

func (p *timedPool) withAcquireDeadline(ctx context.Context) (context.Context, context.CancelFunc) {
	if _, ok := ctx.Deadline(); ok {
		return ctx, func() {}
	}
	return context.WithTimeout(ctx, p.acquireTimeout)
}

func (p *timedPool) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	ctx, cancel := p.withAcquireDeadline(ctx)
	defer cancel()
	return p.Pool.Query(ctx, sql, args...)
}

func (p *timedPool) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	ctx, cancel := p.withAcquireDeadline(ctx)
	defer cancel()
	return p.Pool.QueryRow(ctx, sql, args...)
}

func (p *timedPool) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	ctx, cancel := p.withAcquireDeadline(ctx)
	defer cancel()
	return p.Pool.Exec(ctx, sql, args...)
}

func NewPostgresPool(cfg config.DatabaseConfig) (DBPool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	poolCfg.MaxConns = int32(cfg.MaxOpenConns)
	poolCfg.MinConns = int32(cfg.MaxIdleConns)
	poolCfg.MaxConnLifetime = time.Duration(cfg.ConnMaxLifetimeMinutes) * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &timedPool{Pool: pool, acquireTimeout: dbAcquireTimeout}, nil
}
