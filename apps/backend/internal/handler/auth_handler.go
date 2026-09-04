package handler

import (
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/navia-academy/backend/internal/config"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/response"
)

type AuthHandler struct {
	authService       *service.AuthService
	google            config.GoogleConfig
	siteURL           string
	exposeResetToken  bool
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) WithGoogle(google config.GoogleConfig, siteURL string) *AuthHandler {
	h.google = google
	h.siteURL = siteURL
	return h
}

// WithResetTokenExposure enables returning the password-reset token in the
// API response. Off by default — production must never expose it (no SMTP
// mailer is wired yet; set RESET_TOKEN_EXPOSE=true only for local/manual
// development delivery).
func (h *AuthHandler) WithResetTokenExposure(expose bool) *AuthHandler {
	h.exposeResetToken = expose
	return h
}

// @Summary Register a new user
// @Description Create a new user account. Returns user object + token pair (access + refresh JWT).
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body models.RegisterRequest true "Registration payload"
// @Success 201 {object} response.APIResponse{data=models.AuthResultResponse}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 409 {object} response.APIError "EMAIL_TAKEN"
// @Failure 500 {object} response.APIError "REGISTER_FAILED"
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	result, tokenPair, err := h.authService.Register(c.Context(), req)
	if err != nil {
		if err == service.ErrEmailTaken {
			return response.Error(c, fiber.StatusConflict, "EMAIL_TAKEN", "email already registered")
		}
		return response.Error(c, fiber.StatusInternalServerError, "REGISTER_FAILED", "registration failed")
	}

	return response.JSON(c, fiber.StatusCreated, fiber.Map{
		"user":       result.User,
		"token_pair": tokenPair,
	})
}

// @Summary Create user (admin)
// @Description Admin-only. Creates a user with an explicit role (default student). Public register always yields student; staff roles are created here.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.AdminCreateUserRequest true "User details"
// @Success 201 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 409 {object} response.APIError "EMAIL_TAKEN"
// @Failure 500 {object} response.APIError "CREATE_FAILED"
// @Router /admin/users [post]
func (h *AuthHandler) CreateUser(c *fiber.Ctx) error {
	var req models.AdminCreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	user, err := h.authService.AdminCreateUser(c.Context(), req)
	if err != nil {
		switch err {
		case service.ErrInvalidRole:
			return response.Error(c, fiber.StatusBadRequest, "INVALID_ROLE", "role must be one of: student, contributor, reviewer, admin")
		case service.ErrEmailTaken:
			return response.Error(c, fiber.StatusConflict, "EMAIL_TAKEN", "email already registered")
		default:
			return response.Error(c, fiber.StatusInternalServerError, "CREATE_FAILED", "creation failed")
		}
	}

	return response.JSON(c, fiber.StatusCreated, fiber.Map{"user": user})
}

// @Summary Login
// @Description Authenticate with email + password. Returns user object + token pair.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body models.LoginRequest true "Login credentials"
// @Success 200 {object} response.APIResponse{data=models.AuthResultResponse}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "INVALID_CREDENTIALS"
// @Failure 500 {object} response.APIError "LOGIN_FAILED"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	authResult, tokenPair, err := h.authService.Login(c.Context(), req)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			return response.Error(c, fiber.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
		}
		return response.Error(c, fiber.StatusInternalServerError, "LOGIN_FAILED", "login failed")
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"user":         authResult.User,
		"token_pair":   tokenPair,
	})
}

// @Summary Refresh access token
// @Description Exchange a valid refresh token for a new token pair.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body models.RefreshTokenRequest true "Refresh token"
// @Success 200 {object} response.APIResponse{data=models.TokenPair}
// @Failure 400 {object} response.APIError "INVALID_BODY"
// @Failure 401 {object} response.APIError "INVALID_TOKEN"
// @Failure 500 {object} response.APIError "REFRESH_FAILED"
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req models.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	tokenPair, err := h.authService.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		if err == service.ErrInvalidToken {
			return response.Error(c, fiber.StatusUnauthorized, "INVALID_TOKEN", "invalid or expired refresh token")
		}
		return response.Error(c, fiber.StatusInternalServerError, "REFRESH_FAILED", "token refresh failed")
	}

	return response.JSON(c, fiber.StatusOK, tokenPair)
}

// @Summary Me — current user
// @Description Get the authenticated user's profile.
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=models.User}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 404 {object} response.APIError "USER_NOT_FOUND"
// @Router /me [get]
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	user, err := h.authService.GetCurrentUser(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "USER_NOT_FOUND", "user not found")
	}

	return response.JSON(c, fiber.StatusOK, user)
}

// @Summary Logout
// @Description Invalidate session. Stateless JWT — client discards tokens.
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
// @Failure 500 {object} response.APIError "LOGOUT_FAILED"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if err := h.authService.Logout(c.Context(), userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "LOGOUT_FAILED", "logout failed")
	}
	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Request password reset
// @Description Generate a password reset token (stored hashed, single-use, 30 min TTL). Never returns the token in production; dev-only delivery via RESET_TOKEN_EXPOSE=true.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body object true "Email payload: {\"email\":\"user@example.com\"}"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "RESET_FAILED"
// @Router /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	token, err := h.authService.RequestPasswordReset(c.Context(), req.Email)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "RESET_FAILED", "could not request password reset")
	}

	// Always return ok (do not leak account existence). The reset token is
	// returned ONLY when explicitly enabled for dev/manual delivery.
	data := fiber.Map{"ok": true}
	if h.exposeResetToken && token != "" {
		data["reset_token"] = token
	}
	return response.JSON(c, fiber.StatusOK, data)
}

// @Summary Confirm password reset
// @Description Complete a password reset with the emailed token + new password. Consumes the token (single use).
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body object true "Reset payload: {\"email\":\"...\",\"token\":\"...\",\"new_password\":\"...\"}"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "PASSWORD_TOO_SHORT"
// @Failure 401 {object} response.APIError "INVALID_TOKEN"
// @Router /auth/reset-password/confirm [post]
func (h *AuthHandler) ResetPasswordConfirm(c *fiber.Ctx) error {
	var req struct {
		Email       string `json:"email"`
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}
	if req.Token == "" {
		return response.Error(c, fiber.StatusUnauthorized, "INVALID_TOKEN", "reset token is required")
	}

	if err := h.authService.ConfirmPasswordReset(c.Context(), req.Email, req.Token, req.NewPassword); err != nil {
		switch err {
		case service.ErrPasswordTooShort:
			return response.Error(c, fiber.StatusBadRequest, "PASSWORD_TOO_SHORT", "password policy not met")
		case service.ErrInvalidToken:
			return response.Error(c, fiber.StatusUnauthorized, "INVALID_TOKEN", "reset token is invalid or expired")
		}
		return response.Error(c, fiber.StatusBadRequest, "RESET_FAILED", "password reset failed")
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// @Summary Change password
// @Description Change password for the authenticated user (requires current password).
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Change payload: {\"current_password\":\"...\",\"new_password\":\"...\"}"
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 400 {object} response.APIError "SAME_PASSWORD / CHANGE_FAILED"
// @Failure 401 {object} response.APIError "UNAUTHORIZED / INVALID_CREDENTIALS"
// @Router /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "INVALID_BODY", "invalid request body")
	}

	if err := h.authService.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			return response.Error(c, fiber.StatusUnauthorized, "INVALID_CREDENTIALS", "current password is incorrect")
		case service.ErrSamePassword:
			return response.Error(c, fiber.StatusBadRequest, "SAME_PASSWORD", "new password must be different")
		}
		return response.Error(c, fiber.StatusBadRequest, "CHANGE_FAILED", "password change failed")
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{"ok": true})
}

// GoogleAuthorize returns the Google OAuth authorize URL for the implicit
// flow. Returns 501 when AUTH_GOOGLE_ID is not configured.
// @Summary Google OAuth authorize URL
// @Description Returns the Google OAuth2 authorize URL (implicit flow). 501 when AUTH_GOOGLE_ID not configured.
// @Tags Auth
// @Produce json
// @Success 200 {object} response.APIResponse{data=object}
// @Failure 501 {object} response.APIError "NOT_CONFIGURED"
// @Router /auth/google [get]
func (h *AuthHandler) GoogleAuthorize(c *fiber.Ctx) error {
	redirect := h.google.RedirectURL
	if redirect == "" && h.siteURL != "" {
		redirect = h.siteURL + "/auth/callback"
	}

	if h.google.ClientID == "" || redirect == "" {
		return response.Error(c, fiber.StatusNotImplemented, "NOT_CONFIGURED", "Google sign-in is not configured")
	}

	q := url.Values{}
	q.Set("client_id", h.google.ClientID)
	q.Set("redirect_uri", redirect)
	q.Set("response_type", "token")
	q.Set("scope", "openid email profile")
	q.Set("prompt", "select_account")

	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"url": "https://accounts.google.com/o/oauth2/v2/auth?" + q.Encode(),
	})
}
