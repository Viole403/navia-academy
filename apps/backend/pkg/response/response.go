package response

import (
	"github.com/gofiber/fiber/v2"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	// TraceID echoes the request ID (X-Request-Id) so clients can attach it
	// to bug reports and operators can correlate with server logs.
	TraceID string `json:"trace_id,omitempty"`
}

type Meta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// traceID returns the request ID set by the requestid middleware
// (also sent back as the X-Request-Id response header). Empty when the
// middleware did not run, e.g. in unit tests without the full stack.
func traceID(c *fiber.Ctx) string {
	if v, ok := c.Locals("requestid").(string); ok {
		return v
	}
	return ""
}

func JSON(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(APIResponse{
		Success: status >= 200 && status < 300,
		Data:    data,
		TraceID: traceID(c),
	})
}

func JSONWithMeta(c *fiber.Ctx, status int, data interface{}, meta *Meta) error {
	return c.Status(status).JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
		TraceID: traceID(c),
	})
}

func Error(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
		TraceID: traceID(c),
	})
}

func ErrorWithDetails(c *fiber.Ctx, status int, code, message string, details interface{}) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
		TraceID: traceID(c),
	})
}
