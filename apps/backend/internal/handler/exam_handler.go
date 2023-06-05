package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type ExamHandler struct {
	examService *service.ExamService
}

func NewExamHandler(examService *service.ExamService) *ExamHandler {
	return &ExamHandler{examService: examService}
}

// @Summary Save CAT result
// @Description Persist a completed adaptive (CAT) exam result. Rate-limited 5/min per user.
// @Tags Exam · CAT
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.CatResultRequest true "CAT result payload"
// @Success 201 {object} response.APIResponse{data=models.CatResult}
// @Failure 400 {object} response.APIError "INVALID_BODY / MISSING_FIELDS"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 429 {object} response.APIError "RATE_LIMITED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /cat/result [post]
func (h *ExamHandler) SaveCatResult(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.CatResultRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}
	if req.ExamType == "" || req.EloEstimate == 0 {
		return response.Error(c, fiber.StatusBadRequest, "MISSING_FIELDS", "exam_type and elo_estimate are required")
	}

	result, err := h.examService.SaveCatResult(c.Context(), userID, &req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusCreated, result)
}

// @Summary Get CAT progress
// @Description Get the user's CAT history (Elo estimate, CEFR band). Used for warm-start.
// @Tags Exam · CAT
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=[]models.CatResult}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /cat/progress [get]
func (h *ExamHandler) GetCatProgress(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	progress, err := h.examService.GetCatProgress(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusOK, progress)
}

// @Summary Create CAT session
// @Description Start a new adaptive session. Returns session id for per-answer PATCH. Rate-limited 5/min.
// @Tags Exam · CAT
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.CatSessionCreateRequest true "Session start"
// @Success 201 {object} response.APIResponse{data=models.CatSession}
// @Failure 400 {object} response.APIError "INVALID_BODY / MISSING_FIELDS"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 429 {object} response.APIError "RATE_LIMITED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /cat/session [post]
func (h *ExamHandler) CreateCatSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.CatSessionCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}
	if req.ExamType == "" {
		return response.Error(c, fiber.StatusBadRequest, "MISSING_FIELDS", "exam_type is required")
	}
	session, err := h.examService.CreateCatSession(c.Context(), userID, &req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}
	return response.JSON(c, fiber.StatusCreated, session)
}

// @Summary Patch CAT session (persist answers)
// @Description Append answers to a running session (fire-and-forget from client). Idempotent by item_id. Rate-limited 60/min.
// @Tags Exam · CAT
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Param body body models.CatSessionPatchRequest true "Answers batch"
// @Success 204 "No Content"
// @Failure 400 {object} response.APIError "INVALID_BODY / INVALID_ID"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Failure 429 {object} response.APIError "RATE_LIMITED"
// @Router /cat/session/{id} [patch]
func (h *ExamHandler) PatchCatSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	sessionID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_ID", "invalid session id")
	}
	var req models.CatSessionPatchRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}
	if err := h.examService.PatchCatSession(c.Context(), sessionID, userID, &req); err != nil {
		return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "exam session not found or not owned")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// @Summary Get CAT session
// @Description Get a CAT session state (status, answers, elapsed) for resume.
// @Tags Exam · CAT
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Success 200 {object} response.APIResponse{data=models.CatSession}
// @Failure 400 {object} response.APIError "INVALID_ID"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Router /cat/session/{id} [get]
func (h *ExamHandler) GetCatSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	sessionID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_ID", "invalid session id")
	}
	session, err := h.examService.GetCatSession(c.Context(), sessionID, userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "exam session not found")
	}
	return response.JSON(c, fiber.StatusOK, session)
}

// @Summary List exam sessions
// @Description Query exam sessions/results: type=active | history | progress | recommended, or sessionId for one session.
// @Tags Exam
// @Produce json
// @Security BearerAuth
// @Param type query string false "Query type: active, history, progress, recommended" Enums(active, history, progress, recommended)
// @Param examType query string false "Filter history by exam type" example(hsk)
// @Param limit query int false "History limit (default 50)" example(50)
// @Param offset query int false "History offset" example(0)
// @Param sessionId query int false "Fetch a single session by id" example(1)
// @Success 200 {object} response.APIResponse{data=[]models.ExamSession}
// @Failure 400 {object} response.APIError "INVALID_REQUEST / INVALID_ID"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "NOT_FOUND"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /exam/sessions [get]
func (h *ExamHandler) GetSessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	queryType := c.Query("type")

	switch queryType {
	case "active":
		sessions, err := h.examService.GetActiveSessions(c.Context(), userID)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, sessions)

	case "history":
		examType := c.Query("examType")
		limit, _ := strconv.Atoi(c.Query("limit", "50"))
		offset, _ := strconv.Atoi(c.Query("offset", "0"))

		results, total, err := h.examService.GetExamHistory(c.Context(), userID, examType, limit, offset)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
		}

		totalPages := int(total) / limit
		if int(total)%limit > 0 {
			totalPages++
		}

		page := offset/limit + 1

		return response.JSONWithMeta(c, fiber.StatusOK, results, &response.Meta{
			Page:       page,
			PerPage:    limit,
			Total:      total,
			TotalPages: totalPages,
		})

	case "progress":
		progress, err := h.examService.GetUserProgress(c.Context(), userID)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, progress)

	case "recommended":
		recommended, err := h.examService.GetRecommendedExam(c.Context(), userID)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "FETCH_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, recommended)

	default:
		sessionIDStr := c.Query("sessionId")
		if sessionIDStr != "" {
			sessionID, err := strconv.Atoi(sessionIDStr)
			if err != nil {
				return response.Error(c, fiber.StatusBadRequest, "INVALID_ID", "invalid session id")
			}
			session, err := h.examService.GetSession(c.Context(), sessionID, userID)
			if err != nil {
				return response.Error(c, fiber.StatusNotFound, "NOT_FOUND", "exam session not found")
			}
			return response.JSON(c, fiber.StatusOK, session)
		}

		return response.Error(c, fiber.StatusBadRequest, "INVALID_REQUEST", "invalid request type")
	}
}

// @Summary Create exam session
// @Description Start a new fixed-form exam session.
// @Tags Exam
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.CreateExamRequest true "Session config"
// @Success 201 {object} response.APIResponse{data=models.ExamSession}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /exam/sessions [post]
func (h *ExamHandler) CreateSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.CreateExamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if req.ExamType == "" || req.ExamLevel == "" {
		return response.Error(c, fiber.StatusBadRequest, "MISSING_FIELDS", "examType and examLevel are required")
	}

	session, err := h.examService.CreateSession(c.Context(), userID, req.ExamType, req.ExamLevel, req.Settings)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", err.Error())
	}

	return response.JSON(c, fiber.StatusCreated, session)
}

// @Summary Update exam session
// @Description Submit an answer, submit the exam, or abandon it. action query required.
// @Tags Exam
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param action query string true "Action: answer, submit, abandon" Enums(answer, submit, abandon)
// @Param body body models.SubmitAnswerRequest true "answer → {session_id, question_id, answer}; submit/abandon → {session_id}"
// @Success 200 {object} response.APIResponse{data=models.ExamSession}
// @Failure 400 {object} response.APIError "INVALID_BODY / SUBMIT_FAILED / INVALID_ACTION"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "FETCH_FAILED"
// @Router /exam/sessions [put]
func (h *ExamHandler) UpdateSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	action := c.Query("action")

	switch action {
	case "answer":
		var req models.SubmitAnswerRequest
		if err := c.BodyParser(&req); err != nil {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
		}

		session, err := h.examService.SubmitAnswer(c.Context(), req.SessionID, userID, req.QuestionID, req.Answer)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "SUBMIT_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, session)

	case "submit":
		var req models.SubmitExamRequest
		if err := c.BodyParser(&req); err != nil {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
		}

		result, err := h.examService.SubmitExam(c.Context(), req.SessionID, userID)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "SUBMIT_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, result)

	case "abandon":
		var req models.SubmitExamRequest
		if err := c.BodyParser(&req); err != nil {
			return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
		}

		session, err := h.examService.AbandonExam(c.Context(), req.SessionID, userID)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "ABANDON_FAILED", err.Error())
		}
		return response.JSON(c, fiber.StatusOK, session)

	default:
		return response.Error(c, fiber.StatusBadRequest, "INVALID_ACTION", "invalid action")
	}
}
