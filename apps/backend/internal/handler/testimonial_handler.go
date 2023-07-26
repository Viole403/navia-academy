package handler

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type TestimonialHandler struct {
	testimonialService *service.TestimonialService
}

func NewTestimonialHandler(testimonialService *service.TestimonialService) *TestimonialHandler {
	return &TestimonialHandler{testimonialService: testimonialService}
}

// @Summary List approved testimonials
// @Description Public testimonials for the landing page (APPROVED only).
// @Tags Testimonials
// @Produce json
// @Param limit query int false "Max results (default 9, max 24)" example(9)
// @Success 200 {object} response.APIResponse{data=[]models.Testimonial}
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /testimonials [get]
func (h *TestimonialHandler) GetTestimonials(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "9"))

	items, err := h.testimonialService.GetApproved(c.Context(), limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, items)
}

// @Summary Submit a testimonial
// @Description Store a learner testimonial for moderation (public, rate limited).
// @Tags Testimonials
// @Accept json
// @Produce json
// @Param body body models.CreateTestimonialRequest true "{name, role_label?, quote}"
// @Success 201 {object} response.APIResponse{data=models.Testimonial}
// @Failure 400 {object} response.APIError "INVALID_BODY / VALIDATION_FAILED"
// @Failure 500 {object} response.APIError "SUBMIT_FAILED"
// @Router /testimonials [post]
func (h *TestimonialHandler) SubmitTestimonial(c *fiber.Ctx) error {
	var req models.CreateTestimonialRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	item, err := h.testimonialService.Submit(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrTestimonialValidation) {
			return response.Error(c, fiber.StatusBadRequest, "VALIDATION_FAILED",
				"name must be 2-60 chars and quote 10-280 chars")
		}
		return response.Error(c, fiber.StatusInternalServerError, "SUBMIT_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, item)
}

// @Summary List all testimonials
// @Description Admin listing with optional status filter (?status=PENDING|APPROVED|REJECTED).
// @Tags Testimonials
// @Produce json
// @Security BearerAuth
// @Param status query string false "PENDING | APPROVED | REJECTED" example(PENDING)
// @Success 200 {object} response.APIResponse{data=[]models.Testimonial}
// @Failure 400 {object} response.APIError "INVALID_STATUS"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /testimonials/admin [get]
func (h *TestimonialHandler) ListTestimonials(c *fiber.Ctx) error {
	status := c.Query("status")

	items, err := h.testimonialService.ListAll(c.Context(), status)
	if err != nil {
		if errors.Is(err, service.ErrTestimonialBadStatus) {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_STATUS",
				"status must be PENDING, APPROVED or REJECTED")
		}
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, items)
}

// @Summary Review testimonial
// @Description Approve or reject a testimonial (admin).
// @Tags Testimonials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Testimonial ID"
// @Param body body models.ReviewTestimonialRequest true "Status: APPROVED | REJECTED"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY / INVALID_STATUS"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "REVIEW_FAILED"
// @Router /testimonials/{id}/status [put]
func (h *TestimonialHandler) ReviewTestimonial(c *fiber.Ctx) error {
	id := c.Params("id")

	var req models.ReviewTestimonialRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.testimonialService.Review(c.Context(), id, req); err != nil {
		if errors.Is(err, service.ErrTestimonialBadStatus) {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_STATUS",
				"status must be APPROVED or REJECTED")
		}
		return response.Error(c, fiber.StatusInternalServerError, "REVIEW_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// @Summary Delete testimonial
// @Description Delete a testimonial permanently (admin).
// @Tags Testimonials
// @Produce json
// @Security BearerAuth
// @Param id path string true "Testimonial ID"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "DELETE_FAILED"
// @Router /testimonials/{id} [delete]
func (h *TestimonialHandler) DeleteTestimonial(c *fiber.Ctx) error {
	if err := h.testimonialService.Delete(c.Context(), c.Params("id")); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "DELETE_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}
