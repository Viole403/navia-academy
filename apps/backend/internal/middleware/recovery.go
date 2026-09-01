package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/pkg/response"
	"go.uber.org/zap"
	"runtime/debug"
)

func RecoveryMiddleware(log *zap.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered",
					zap.Any("panic", r),
					zap.String("path", c.Path()),
					zap.String("method", c.Method()),
					zap.String("stack", string(debug.Stack())),
				)
				response.Error(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "an unexpected error occurred")
			}
		}()
		return c.Next()
	}
}
