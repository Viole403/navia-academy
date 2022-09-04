package models

import "time"

type User struct {
	ID            string    `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Email         string    `json:"email" db:"email"`
	EmailVerified bool      `json:"email_verified" db:"email_verified"`
	Image         *string   `json:"image,omitempty" db:"image"`
	Role          string    `json:"role" db:"role"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type Session struct {
	ID        string    `json:"id" db:"id"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	Token     string    `json:"token" db:"token"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	IPAddress *string   `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent *string   `json:"user_agent,omitempty" db:"user_agent"`
	UserID    string    `json:"user_id" db:"user_id"`
}

type Account struct {
	ID                    string     `json:"id" db:"id"`
	AccountID             string     `json:"account_id" db:"account_id"`
	ProviderID            string     `json:"provider_id" db:"provider_id"`
	UserID                string     `json:"user_id" db:"user_id"`
	AccessToken           *string    `json:"access_token,omitempty" db:"access_token"`
	RefreshToken          *string    `json:"refresh_token,omitempty" db:"refresh_token"`
	IDToken               *string    `json:"id_token,omitempty" db:"id_token"`
	AccessTokenExpiresAt  *time.Time `json:"access_token_expires_at,omitempty" db:"access_token_expires_at"`
	RefreshTokenExpiresAt *time.Time `json:"refresh_token_expires_at,omitempty" db:"refresh_token_expires_at"`
	Scope                 *string    `json:"scope,omitempty" db:"scope"`
	Password              *string    `json:"-" db:"password"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

type Verification struct {
	ID         string     `json:"id" db:"id"`
	Identifier string     `json:"identifier" db:"identifier"`
	Value      string     `json:"value" db:"value"`
	ExpiresAt  time.Time  `json:"expires_at" db:"expires_at"`
	CreatedAt  *time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100" example:"Budi Santoso"`
	Email    string `json:"email" validate:"required,email" example:"budi@example.com"`
	Password string `json:"password" validate:"required,min=8,max=128" example:"Rahasia123!"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email" example:"budi@example.com"`
	Password string `json:"password" validate:"required" example:"Rahasia123!"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required" example:"<jwt-refresh-token>"`
}

type SetUserRoleRequest struct {
	Role string `json:"role" validate:"required" example:"reviewer"`
}

type AdminCreateUserRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100" example:"Ibu Sari"`
	Email    string `json:"email" validate:"required,email" example:"sari@example.com"`
	Password string `json:"password" validate:"required,min=8,max=128" example:"Rahasia123!"`
	Role     string `json:"role" example:"reviewer"`
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token,omitempty"`
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type AuthResultResponse struct {
	User      User      `json:"user"`
	TokenPair TokenPair `json:"token_pair"`
}
