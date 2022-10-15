package models

import "time"

type Supporter struct {
	ID         int64     `json:"id" db:"id"`
	Name       string    `json:"name" db:"name"`
	AvatarURL  *string   `json:"avatar_url,omitempty" db:"avatar_url"`
	Platform   string    `json:"platform" db:"platform"`
	Amount     *float64  `json:"-" db:"amount"`
	Message    *string   `json:"message,omitempty" db:"message"`
	IsPublic   bool      `json:"is_public" db:"is_public"`
	ExternalID string    `json:"-" db:"external_id"`
	DonatedAt  time.Time `json:"donated_at" db:"donated_at"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

func (s Supporter) Public() PublicSupporter {
	return PublicSupporter{
		Name:      s.Name,
		AvatarURL: s.AvatarURL,
		Platform:  s.Platform,
		Message:   s.Message,
		DonatedAt: s.DonatedAt,
	}
}

type PublicSupporter struct {
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	Platform  string    `json:"platform"`
	Message   *string   `json:"message,omitempty"`
	DonatedAt time.Time `json:"donated_at"`
}