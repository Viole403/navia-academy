package repository

import (
	"context"
	"time"

	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/models"
)

type UserRepository struct {
	pool database.DBPool
}

func NewUserRepository(pool database.DBPool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO "user" (id, name, email, email_verified, image, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, user.ID, user.Name, user.Email, user.EmailVerified, user.Image, user.Role, now, now)
	return err
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, email_verified, image, role, created_at, updated_at
		FROM "user" WHERE id = $1
	`, id)

	user := &models.User{}
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.EmailVerified, &user.Image, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, email_verified, image, role, created_at, updated_at
		FROM "user" WHERE email = $1
	`, email)

	user := &models.User{}
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.EmailVerified, &user.Image, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindAccountByEmail(ctx context.Context, email string) (*models.Account, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT a.id, a.account_id, a.provider_id, a.user_id, a.access_token, a.refresh_token,
		       a.id_token, a.access_token_expires_at, a.refresh_token_expires_at, a.scope, a.password,
		       a.created_at, a.updated_at
		FROM account a
		JOIN "user" u ON u.id = a.user_id
		WHERE u.email = $1 AND a.provider_id = 'email'
	`, email)

	acc := &models.Account{}
	err := row.Scan(&acc.ID, &acc.AccountID, &acc.ProviderID, &acc.UserID,
		&acc.AccessToken, &acc.RefreshToken, &acc.IDToken,
		&acc.AccessTokenExpiresAt, &acc.RefreshTokenExpiresAt, &acc.Scope, &acc.Password,
		&acc.CreatedAt, &acc.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return acc, nil
}

func (r *UserRepository) FindAccountByUser(ctx context.Context, userID, providerID string) (*models.Account, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, account_id, provider_id, user_id, access_token, refresh_token,
		       id_token, access_token_expires_at, refresh_token_expires_at, scope, password,
		       created_at, updated_at
		FROM account WHERE user_id = $1 AND provider_id = $2
	`, userID, providerID)

	acc := &models.Account{}
	err := row.Scan(&acc.ID, &acc.AccountID, &acc.ProviderID, &acc.UserID,
		&acc.AccessToken, &acc.RefreshToken, &acc.IDToken,
		&acc.AccessTokenExpiresAt, &acc.RefreshTokenExpiresAt, &acc.Scope, &acc.Password,
		&acc.CreatedAt, &acc.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return acc, nil
}

func (r *UserRepository) CreateAccount(ctx context.Context, userID, providerID, accountID, hashedPassword string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, "acc-"+userID, accountID, providerID, userID, hashedPassword, now, now)
	return err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, userID, hashedPassword string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		UPDATE account SET password = $1, updated_at = $2 WHERE user_id = $3 AND provider_id = 'email'
	`, hashedPassword, now, userID)
	return err
}

func (r *UserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		UPDATE "user" SET name = $1, image = $2, role = $3, updated_at = $4 WHERE id = $5
	`, user.Name, user.Image, user.Role, now, user.ID)
	return err
}

func (r *UserRepository) UpdateRole(ctx context.Context, userID, role string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE "user" SET role = $1, updated_at = now() WHERE id = $2
	`, role, userID)
	return err
}

// ListAll returns a page of users (id, name, email, role, created_at) for the
// admin user registry. Bounded pagination keeps the response small at scale.
func (r *UserRepository) ListAll(ctx context.Context, limit, offset int) ([]models.User, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, email, email_verified, image, role, created_at, updated_at
		FROM "user" ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		u := models.User{}
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.EmailVerified, &u.Image, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepository) CreateVerification(ctx context.Context, id, identifier, value string, expiresAt time.Time) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, identifier, value, expiresAt, now, now)
	return err
}

// FindVerification looks up a verification record by identifier + value
// (e.g. "reset:user@example.com" + hashed token). Returns nil when the
// record is missing or expired (caller treats as "invalid").
func (r *UserRepository) FindVerification(ctx context.Context, identifier, value string) (*models.Verification, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, identifier, value, expires_at, created_at, updated_at
		FROM verification
		WHERE identifier = $1 AND value = $2 AND expires_at > NOW()
	`, identifier, value)
	v := &models.Verification{}
	if err := row.Scan(&v.ID, &v.Identifier, &v.Value, &v.ExpiresAt, &v.CreatedAt, &v.UpdatedAt); err != nil {
		return nil, err
	}
	return v, nil
}

// DeleteVerification removes a verification record by id.
func (r *UserRepository) DeleteVerification(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM verification WHERE id = $1`, id)
	return err
}
