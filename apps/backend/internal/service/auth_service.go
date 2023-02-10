package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
	"github.com/navia-academy/backend/pkg/jwt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrSamePassword       = errors.New("new password must be different")
	ErrEmailRequired      = errors.New("email is required")
	ErrInvalidRole        = errors.New("invalid role")
)

// ValidRoles is the set of assignable roles for user management.
var ValidRoles = map[string]bool{
	"student":     true,
	"contributor": true,
	"reviewer":    true,
	"admin":       true,
}

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSvc    *jwt.JWTService
}

func NewAuthService(userRepo *repository.UserRepository, jwtSvc *jwt.JWTService) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSvc:    jwtSvc,
	}
}

func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, *jwt.TokenPair, error) {
	existing, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existing != nil {
		return nil, nil, ErrEmailTaken
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}

	now := time.Now()
	user := &models.User{
		ID:            uuid.New().String(),
		Name:          req.Name,
		Email:         req.Email,
		EmailVerified: false,
		Role:          "student",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, err
	}

	if err := s.userRepo.CreateAccount(ctx, user.ID, "email", req.Email, string(hashedPassword)); err != nil {
		return nil, nil, err
	}

	tokenPair, err := s.jwtSvc.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, nil, err
	}

	return &models.AuthResponse{
		User:  *user,
		Token: tokenPair.AccessToken,
	}, tokenPair, nil
}

// AdminCreateUser creates a user (optionally with a staff role).
// Public register always produces "student"; other roles are assigned here.
func (s *AuthService) AdminCreateUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error) {
	role := req.Role
	if role == "" {
		role = "student"
	}
	if !ValidRoles[role] {
		return nil, ErrInvalidRole
	}

	existing, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &models.User{
		ID:            uuid.New().String(),
		Name:          req.Name,
		Email:         req.Email,
		EmailVerified: false,
		Role:          role,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}
	if err := s.userRepo.CreateAccount(ctx, user.ID, "email", req.Email, string(hashedPassword)); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, *jwt.TokenPair, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	account, err := s.userRepo.FindAccountByEmail(ctx, req.Email)
	if err != nil || account.Password == nil {
		return nil, nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*account.Password), []byte(req.Password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	tokenPair, err := s.jwtSvc.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, nil, err
	}

	return &models.AuthResponse{
		User:  *user,
		Token: tokenPair.AccessToken,
	}, tokenPair, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*jwt.TokenPair, error) {
	claims, err := s.jwtSvc.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	tokenPair, err := s.jwtSvc.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return tokenPair, nil
}

func (s *AuthService) GetCurrentUser(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *AuthService) Logout(ctx context.Context, userID string) error {
	// Stateless JWT auth: client discards tokens; nothing to persist server-side.
	return nil
}

// RequestPasswordReset generates a reset token and stores it in verification.
// Returns the token so the caller can email it (SMTP may be unconfigured in dev).
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) (string, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return "", ErrEmailRequired
	}

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		// Do not leak whether the email exists.
		return "", nil
	}

	token := uuid.New().String()
	expiresAt := time.Now().Add(30 * time.Minute)
	if err := s.userRepo.CreateVerification(ctx, "reset-"+uuid.New().String(), user.ID, token, expiresAt); err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	if newPassword == "" || len(newPassword) < 8 {
		return errors.New("new password must be at least 8 characters")
	}

	account, err := s.userRepo.FindAccountByUser(ctx, userID, "email")
	if err != nil || account.Password == nil {
		return ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*account.Password), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	if currentPassword == newPassword {
		return ErrSamePassword
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(ctx, userID, string(hashed))
}
