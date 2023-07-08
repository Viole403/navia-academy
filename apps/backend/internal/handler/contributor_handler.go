package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type ContributorHandler struct {
	contributorService *service.ContributorService
}

func NewContributorHandler(contributorService *service.ContributorService) *ContributorHandler {
	return &ContributorHandler{contributorService: contributorService}
}

// @Summary List contributors
// @Description Get active contributors (public).
// @Tags Contributors · Sponsors
// @Produce json
// @Param limit query int false "Max results (default 50, max 100)" example(50)
// @Param offset query int false "Pagination offset" example(0)
// @Success 200 {object} response.APIResponse{data=[]models.Contributor}
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /contributors [get]
func (h *ContributorHandler) GetContributors(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit > 100 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	contributors, err := h.contributorService.GetContributors(c.Context(), limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, contributors)
}

// @Summary Get contributor by id
// @Description Get a single contributor profile.
// @Tags Contributors · Sponsors
// @Produce json
// @Param id path string true "Contributor ID"
// @Success 200 {object} response.APIResponse{data=models.Contributor}
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Router /contributors/{id} [get]
func (h *ContributorHandler) GetContributor(c *fiber.Ctx) error {
	id := c.Params("id")
	contributor, err := h.contributorService.GetContributorByID(c.Context(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "contributor not found")
	}
	return response.JSON(c, fiber.StatusOK, contributor)
}

// @Summary Update contributor
// @Description Update contributor profile fields.
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contributor ID"
// @Param body body object true "Partial fields"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /contributors/{id} [put]
func (h *ContributorHandler) UpdateContributor(c *fiber.Ctx) error {
	id := c.Params("id")

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.contributorService.UpdateContributor(c.Context(), id, req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// @Summary Delete contributor
// @Description Delete a contributor (admin).
// @Tags Contributors · Sponsors
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contributor ID"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "DELETE_FAILED"
// @Router /contributors/{id} [delete]
func (h *ContributorHandler) DeleteContributor(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.contributorService.DeleteContributor(c.Context(), id); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "DELETE_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// @Summary List sponsors
// @Description Get active sponsors (public).
// @Tags Contributors · Sponsors
// @Produce json
// @Success 200 {object} response.APIResponse{data=[]models.Sponsor}
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /sponsors [get]
func (h *ContributorHandler) GetSponsors(c *fiber.Ctx) error {
	sponsors, err := h.contributorService.GetSponsors(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, sponsors)
}

// @Summary Create sponsor
// @Description Create a sponsor (admin).
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.CreateSponsorRequest true "Sponsor data"
// @Success 201 {object} response.APIResponse{data=models.Sponsor}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /sponsors [post]
func (h *ContributorHandler) CreateSponsor(c *fiber.Ctx) error {
	var req models.CreateSponsorRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	sponsor, err := h.contributorService.CreateSponsor(c.Context(), req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, sponsor)
}

// @Summary Get sponsor by id
// @Description Get a single sponsor.
// @Tags Contributors · Sponsors
// @Produce json
// @Param id path string true "Sponsor ID"
// @Success 200 {object} response.APIResponse{data=models.Sponsor}
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Router /sponsors/{id} [get]
func (h *ContributorHandler) GetSponsor(c *fiber.Ctx) error {
	id := c.Params("id")
	sponsor, err := h.contributorService.GetSponsorByID(c.Context(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "sponsor not found")
	}
	return response.JSON(c, fiber.StatusOK, sponsor)
}

// @Summary Update sponsor
// @Description Update sponsor fields (admin).
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Sponsor ID"
// @Param body body object true "Partial fields"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "UPDATE_FAILED"
// @Router /sponsors/{id} [put]
func (h *ContributorHandler) UpdateSponsor(c *fiber.Ctx) error {
	id := c.Params("id")

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.contributorService.UpdateSponsor(c.Context(), id, req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "UPDATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// @Summary Delete sponsor
// @Description Delete a sponsor (admin).
// @Tags Contributors · Sponsors
// @Produce json
// @Security BearerAuth
// @Param id path string true "Sponsor ID"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "DELETE_FAILED"
// @Router /sponsors/{id} [delete]
func (h *ContributorHandler) DeleteSponsor(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.contributorService.DeleteSponsor(c.Context(), id); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "DELETE_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// @Summary List contributor applications
// @Description Get contributor applications (admin).
// @Tags Contributors · Sponsors
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.ContributorApplication}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /contributors/applications [get]
func (h *ContributorHandler) GetContributorApplications(c *fiber.Ctx) error {
	applications, err := h.contributorService.GetContributorApplications(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, applications)
}

// @Summary Apply as contributor
// @Description Submit a contributor application (public).
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Param body body models.CreateContributorApplicationRequest true "Application data"
// @Success 201 {object} response.APIResponse{data=models.ContributorApplication}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 500 {object} response.APIError "APPLY_FAILED"
// @Router /contributors/apply [post]
func (h *ContributorHandler) ApplyContributor(c *fiber.Ctx) error {
	var req models.CreateContributorApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	app, err := h.contributorService.ApplyContributor(c.Context(), req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "APPLY_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, app)
}

// @Summary Review contributor application
// @Description Approve or reject a contributor application (admin).
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Application ID"
// @Param body body models.ReviewApplicationRequest true "Status: APPROVED | REJECTED"
// @Success 200 {object} response.APIResponse{data=models.ContributorApplication}
// @Failure 400 {object} response.APIError "INVALID_BODY / REVIEW_FAILED"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Router /contributors/applications/{id}/review [put]
func (h *ContributorHandler) ReviewApplication(c *fiber.Ctx) error {
	id := c.Params("id")

	var req models.ReviewApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	app, err := h.contributorService.ReviewContributorApplication(c.Context(), id, req.Status, req.ReviewedBy)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "REVIEW_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusOK, app)
}

// @Summary List sponsor applications
// @Description Get sponsor applications (admin).
// @Tags Contributors · Sponsors
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.SponsorApplication}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /sponsors/applications [get]
func (h *ContributorHandler) GetSponsorApplications(c *fiber.Ctx) error {
	applications, err := h.contributorService.GetSponsorApplications(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, applications)
}

// @Summary Apply as sponsor
// @Description Submit a sponsor application (public).
// @Tags Contributors · Sponsors
// @Accept json
// @Produce json
// @Param body body models.CreateSponsorApplicationRequest true "Application data"
// @Success 201 {object} response.APIResponse{data=models.SponsorApplication}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 500 {object} response.APIError "APPLY_FAILED"
// @Router /sponsors/apply [post]
func (h *ContributorHandler) ApplySponsor(c *fiber.Ctx) error {
	var req models.CreateSponsorApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	app, err := h.contributorService.ApplySponsor(c.Context(), req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "APPLY_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, app)
}
