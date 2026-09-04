package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func CORSMiddleware(allowedOrigins string) fiber.Handler {
	origins := strings.Split(allowedOrigins, ",")
	originMap := make(map[string]bool, len(origins))
	for _, o := range origins {
		originMap[strings.TrimSpace(o)] = true
	}

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		isWildcard := originMap["*"]
		if originMap[origin] || isWildcard {
			if !isWildcard {
				c.Set("Access-Control-Allow-Origin", origin)
				c.Set("Access-Control-Allow-Credentials", "true")
			} else {
				c.Set("Access-Control-Allow-Origin", origin)
			}
			c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
			c.Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, X-TTS-Cache, X-TTS-Provider")
			c.Set("Access-Control-Max-Age", "86400")
		}

		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}
