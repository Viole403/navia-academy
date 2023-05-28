package handler

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type ContentHandler struct {
	contentService *service.ContentService
}

func NewContentHandler(contentService *service.ContentService) *ContentHandler {
	return &ContentHandler{contentService: contentService}
}

// List returns content items (write-path store). Contributors filter by
// lang/domain/status; reviewers may pass status=all.
// @Summary List content items
// @Description List content store items (write path). Contributors filter by lang/domain/status; reviewers may pass status=all.
// @Tags Content · Items
// @Produce json
// @Security BearerAuth
// @Param lang query string false "Language" example(zh)
// @Param domain query string false "Domain" example(vocabulary)
// @Param status query string false "Status: draft | review | published | rejected | all" example(draft)
// @Param limit query int false "Max results (default 50, max 500)" example(50)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} response.APIResponse{data=[]models.ContentItem}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /content [get]
func (h *ContentHandler) List(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit > 500 {
		limit = 500
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	userID, _ := c.Locals("user_id").(string)
	role, _ := c.Locals("role").(string)

	items, err := h.contentService.List(c.Context(), models.ContentListRequest{
		Lang:   c.Query("lang"),
		Domain: c.Query("domain"),
		Status: c.Query("status"),
		Limit:  limit,
		Offset: offset,
	}, userID, role)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	if items == nil {
		items = []models.ContentItem{}
	}
	return response.JSON(c, fiber.StatusOK, items)
}

// @Summary Get content item
// @Description Get a single content item by lang/domain/id.
// @Tags Content · Items
// @Produce json
// @Security BearerAuth
// @Param lang path string true "Language" example(zh)
// @Param domain path string true "Domain" example(vocabulary)
// @Param id path string true "Item ID" example(hsk1-word-001)
// @Success 200 {object} response.APIResponse{data=models.ContentItem}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Router /content/{lang}/{domain}/{id} [get]
func (h *ContentHandler) Get(c *fiber.Ctx) error {
	item, err := h.contentService.Get(c.Context(), c.Params("lang"), c.Params("domain"), c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "content item not found")
	}
	return response.JSON(c, fiber.StatusOK, item)
}

// @Summary Create content item
// @Description Create a content item (draft) as a contributor.
// @Tags Content · Items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.CreateContentRequest true "Item payload"
// @Success 201 {object} response.APIResponse{data=models.ContentItem}
// @Failure 400 {object} response.APIError "CREATE_FAILED"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 409 {object} response.APIError "duplicate-id"
// @Router /content [post]
func (h *ContentHandler) Create(c *fiber.Ctx) error {
	var req models.CreateContentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	userID, _ := c.Locals("user_id").(string)
	item, err := h.contentService.Create(c.Context(), req, userID)
	if err != nil {
		if err == service.ErrDuplicateID {
			return response.Error(c, fiber.StatusConflict, "duplicate-id", err.Error())
		}
		return response.Error(c, fiber.StatusBadRequest, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, item)
}

// @Summary Update content item
// @Description Update a content item (owner or reviewer). Optimistic lock via expected_updated_at.
// @Tags Content · Items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param lang path string true "Language" example(zh)
// @Param domain path string true "Domain" example(vocabulary)
// @Param id path string true "Item ID" example(hsk1-word-001)
// @Param body body models.UpdateContentRequest true "Partial update + expected_updated_at"
// @Success 200 {object} response.APIResponse{data=models.ContentItem}
// @Failure 400 {object} response.APIError "UPDATE_FAILED"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 403 {object} response.APIError "FORBIDDEN"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Failure 409 {object} response.APIError "ITEM_LOCKED / STALE_ITEM"
// @Router /content/{lang}/{domain}/{id} [put]
func (h *ContentHandler) Update(c *fiber.Ctx) error {
	var req models.UpdateContentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	userID, _ := c.Locals("user_id").(string)
	role, _ := c.Locals("role").(string)

	item, err := h.contentService.Update(c.Context(), c.Params("lang"), c.Params("domain"), c.Params("id"), userID, role, req)
	if err != nil {
		switch err {
		case service.ErrContentNotFound:
			return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "content item not found")
		case service.ErrContentForbidden:
			return response.Error(c, fiber.StatusForbidden, "FORBIDDEN", "you are not the owner of this item")
		case service.ErrContentLocked:
			return response.Error(c, fiber.StatusConflict, "ITEM_LOCKED", "item is under review and locked for edits")
		case service.ErrContentStale:
			return response.Error(c, fiber.StatusConflict, "STALE_ITEM", "item changed since your last read; refresh and retry")
		}
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, item)
}

// @Summary Review content item
// @Description Publish or reject a content item (reviewer).
// @Tags Content · Items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param lang path string true "Language" example(zh)
// @Param domain path string true "Domain" example(vocabulary)
// @Param id path string true "Item ID" example(hsk1-word-001)
// @Param body body models.ReviewContentRequest true "Status: published (requires ref) | rejected (+ note)"
// @Success 200 {object} response.APIResponse{data=models.ContentItem}
// @Failure 400 {object} response.APIError "INVALID_STATUS / MISSING_REF / INVALID_REF / REVIEW_FAILED"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Router /content/{lang}/{domain}/{id}/review [post]
func (h *ContentHandler) Review(c *fiber.Ctx) error {
	var req models.ReviewContentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	userID := c.Locals("user_id").(string)
	item, err := h.contentService.Review(c.Context(), c.Params("lang"), c.Params("domain"), c.Params("id"),
		strings.ToLower(req.Status), userID, req.ReviewNote, req.Ref)
	if err != nil {
		switch err {
		case service.ErrContentNotFound:
			return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "content item not found")
		case service.ErrInvalidReview:
			return response.Error(c, fiber.StatusBadRequest, "INVALID_STATUS", "status must be published or rejected")
		case service.ErrMissingRef:
			return response.Error(c, fiber.StatusBadRequest, "MISSING_REF", err.Error())
		case service.ErrInvalidRef:
			return response.Error(c, fiber.StatusBadRequest, "INVALID_REF", err.Error())
		}
		return response.Error(c, fiber.StatusBadRequest, "REVIEW_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, item)
}

// Export streams published content items for the apps/media CDN sync bridge.
// Machine-to-machine: authenticated by ServiceTokenMiddleware (shared
// CONTENT_EXPORT_TOKEN), NOT a user JWT — no authMW in front of this route.
// @Summary Export published content items
// @Description Read-only machine-to-machine feed of published content items for apps/media's sync script. Authenticated with the shared CONTENT_EXPORT_TOKEN bearer token, not user BearerAuth.
// @Tags Content · Items
// @Produce json
// @Security ServiceTokenAuth
// @Param lang query string false "Language" example(zh)
// @Param domain query string false "Domain" example(vocabulary)
// @Param since query string false "Only rows updated after this RFC3339 timestamp" example(2026-01-01T00:00:00Z)
// @Param limit query int false "Max results per page (default 500, max 1000)" example(500)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} models.ContentExportResponse
// @Failure 400 {object} response.APIError "INVALID_LANG / INVALID_DOMAIN / INVALID_SINCE"
// @Failure 401 {object} response.APIError "UNAUTHORIZED"
// @Failure 503 {object} response.APIError "EXPORT_DISABLED"
// @Router /content/export [get]
func (h *ContentHandler) Export(c *fiber.Ctx) error {
	lang := strings.TrimSpace(c.Query("lang"))
	domain := strings.TrimSpace(c.Query("domain"))

	limit, _ := strconv.Atoi(c.Query("limit", "500"))
	if limit <= 0 {
		limit = 500
	}
	if limit > 1000 {
		limit = 1000
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if offset < 0 {
		offset = 0
	}

	var since *time.Time
	if raw := strings.TrimSpace(c.Query("since")); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_SINCE", "since must be an RFC3339 timestamp")
		}
		since = &t
	}

	items, total, err := h.contentService.Export(c.Context(), lang, domain, since, limit, offset)
	if err != nil {
		switch err {
		case service.ErrInvalidLang:
			return response.Error(c, fiber.StatusBadRequest, "INVALID_LANG", err.Error())
		case service.ErrInvalidDomain:
			return response.Error(c, fiber.StatusBadRequest, "INVALID_DOMAIN", err.Error())
		}
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return c.Status(fiber.StatusOK).JSON(models.ContentExportResponse{
		Success: true,
		Data:    items,
		Meta: models.ContentExportMeta{
			Count:          len(items),
			TotalPublished: total,
			GeneratedAt:    time.Now(),
		},
	})
}

