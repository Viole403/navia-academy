package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

func LoggerMiddleware(log *zap.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		path := c.Path()
		method := c.Method()

		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()

		fields := []zap.Field{
			zap.Int("status", status),
			zap.String("method", method),
			zap.String("path", path),
			zap.Duration("latency", latency),
			zap.String("ip", c.IP()),
			zap.String("user_agent", c.Get("User-Agent")),
		}

		if reqID := c.Locals("request_id"); reqID != nil {
			fields = append(fields, zap.String("request_id", reqID.(string)))
		}

		if userID := c.Locals("user_id"); userID != nil {
			fields = append(fields, zap.String("user_id", userID.(string)))
		}

		if status >= 500 {
			log.Error("server error", fields...)
		} else if status >= 400 {
			log.Warn("client error", fields...)
		} else {
			log.Info("request", fields...)
		}

		return err
	}
}
