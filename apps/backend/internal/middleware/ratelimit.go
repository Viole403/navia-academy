package middleware

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/navia-academy/backend/pkg/response"
)

// RateLimitMiddleware returns a per-identifier fixed-window limiter backed by
// Redis. The scope parameter namespaces the Redis key ("ratelimit:<scope>:<id>")
// so separate limiter instances (e.g. the app-wide limit and the /tts limit)
// count against independent buckets instead of sharing one.
func RateLimitMiddleware(redisCli *redis.Client, scope string, limitPerMin int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if redisCli == nil {
			logRedisUnavailable("redis client is nil")
			return c.Next()
		}

		identifier := c.IP()
		if userID := c.Locals("user_id"); userID != nil {
			identifier = userID.(string)
		}

		key := "ratelimit:" + scope + ":" + identifier
		ctx := context.Background()

		count, err := redisCli.Incr(ctx, key).Result()
		if err != nil {
			// Fail open: availability over throttling, but stay loud so the
			// abuse-protection gap is visible in logs/alerts.
			logRedisUnavailable(err.Error())
			return c.Next()
		}

		if count == 1 {
			redisCli.Expire(ctx, key, 60*time.Second)
		}

		remaining := limitPerMin - int(count)
		if remaining < 0 {
			remaining = 0
		}

		c.Set("X-RateLimit-Limit", strconv.Itoa(limitPerMin))
		c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(60*time.Second).Unix(), 10))

		if count > int64(limitPerMin) {
			c.Set("Retry-After", "60")
			return response.Error(c, fiber.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please try again later")
		}

		return c.Next()
	}
}

// redisFailLog throttles the fail-open error to one line per interval so a
// sustained outage stays visible without flooding the log stream.
var (
	redisFailMu     sync.Mutex
	redisFailLastAt time.Time
)

const redisFailLogEvery = 30 * time.Second

func logRedisUnavailable(reason string) {
	redisFailMu.Lock()
	defer redisFailMu.Unlock()
	if time.Since(redisFailLastAt) < redisFailLogEvery {
		return
	}
	redisFailLastAt = time.Now()
	zap.L().Error("rate limiter disabled: redis unavailable; requests are NOT being rate limited",
		zap.String("reason", reason))
}
