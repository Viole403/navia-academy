package middleware

import (
	"crypto/subtle"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/pkg/jwt"
	"github.com/navia-academy/backend/pkg/response"
)

func AuthMiddleware(jwtSvc *jwt.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Error(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return response.Error(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid authorization format")
		}

		claims, err := jwtSvc.ValidateAccessToken(parts[1])
		if err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "TOKEN_EXPIRED", "access token is invalid or expired")
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("role")
		if role != "admin" {
			return response.Error(c, fiber.StatusForbidden, "FORBIDDEN", "admin access required")
		}
		return c.Next()
	}
}

func RoleMiddleware(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		for _, r := range roles {
			if role == r {
				return c.Next()
			}
		}
		return response.Error(c, fiber.StatusForbidden, "FORBIDDEN", "insufficient role")
	}
}

func OptionalAuthMiddleware(jwtSvc *jwt.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Next()
		}

		claims, err := jwtSvc.ValidateAccessToken(parts[1])
		if err == nil {
			c.Locals("user_id", claims.UserID)
			c.Locals("email", claims.Email)
			c.Locals("role", claims.Role)
		}

		return c.Next()
	}
}

// ServiceTokenMiddleware gates machine-to-machine endpoints (e.g. the
// apps/media content sync hitting /content/export) with a shared bearer
// token instead of user JWTs. Compared in constant time.
//
// An EMPTY configured token disables the route entirely (503 EXPORT_DISABLED)
// so an unconfigured deployment never exposes the endpoint by accident.
func ServiceTokenMiddleware(configuredToken string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if configuredToken == "" {
			return response.Error(c, fiber.StatusServiceUnavailable, "EXPORT_DISABLED", "service token not configured")
		}

		authHeader := c.Get("Authorization")
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") ||
			subtle.ConstantTimeCompare([]byte(parts[1]), []byte(configuredToken)) != 1 {
			return response.Error(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid service token")
		}

		return c.Next()
	}
}
