package models

import (
	"encoding/json"
	"time"
)

// ContentItem is the write-path content store (contributor → reviewer workflow).
// End users read from R2/CDN; this table is the source of truth for edits.
type ContentItem struct {
	ID         string          `json:"id" db:"id"`
	Lang       string          `json:"lang" db:"lang"`
	Domain     string          `json:"domain" db:"domain"`
	Ref        string          `json:"ref,omitempty" db:"ref"`
	Pos        int             `json:"pos" db:"pos"`
	Kind       string          `json:"kind" db:"kind"`
	Payload    json.RawMessage `json:"payload" db:"payload"`
	Status     string          `json:"status" db:"status"`
	CreatedBy  string          `json:"created_by" db:"created_by"`
	ReviewerID *string         `json:"reviewer_id,omitempty" db:"reviewer_id"`
	ReviewedAt *time.Time      `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewNote *string         `json:"review_note,omitempty" db:"review_note"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at" db:"updated_at"`
}

type ContentListRequest struct {
	Lang   string `json:"lang"`
	Domain string `json:"domain"`
	Status string `json:"status"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}

type CreateContentRequest struct {
	Lang    string          `json:"lang"`
	Domain  string          `json:"domain"`
	Ref     string          `json:"ref"`
	Pos     int             `json:"pos"`
	ID      string          `json:"id"`
	Kind    string          `json:"kind"`
	Payload json.RawMessage `json:"payload"`
}

type UpdateContentRequest struct {
	Payload           *json.RawMessage `json:"payload,omitempty"`
	Status            *string          `json:"status,omitempty"` // draft | review
	Ref               *string          `json:"ref,omitempty"`    // proposed level, e.g. "hsk/hsk3"
	ExpectedUpdatedAt *string          `json:"expected_updated_at,omitempty"`
}

type ReviewContentRequest struct {
	Status     string `json:"status"` // published | rejected
	ReviewNote string `json:"review_note,omitempty"`
	// Ref is REQUIRED when publishing — the reviewer-assigned target level
	// (e.g. "hsk/hsk3"); ignored when rejecting.
	Ref string `json:"ref,omitempty" example:"hsk/hsk3"`
}

// ExportContentItem is one published row projected for the machine-to-machine
// export endpoint (internal review fields stripped).
type ExportContentItem struct {
	ID        string          `json:"id"`
	Lang      string          `json:"lang"`
	Domain    string          `json:"domain"`
	Ref       string          `json:"ref,omitempty"`
	Pos       int             `json:"pos"`
	Payload   json.RawMessage `json:"payload"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type ContentExportMeta struct {
	Count          int       `json:"count"`
	TotalPublished int64     `json:"total_published"`
	GeneratedAt    time.Time `json:"generated_at"`
}

// ContentExportResponse is the export envelope. It intentionally does not
// reuse pkg/response.Meta (which is pagination-shaped); the sync script in
// apps/media parses count/total_published/generated_at.
type ContentExportResponse struct {
	Success bool                `json:"success"`
	Data    []ExportContentItem `json:"data"`
	Meta    ContentExportMeta   `json:"meta"`
}
