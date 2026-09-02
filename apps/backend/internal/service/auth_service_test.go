package service

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestHashResetToken(t *testing.T) {
	token := "550e8400-e29b-41d4-a716-446655440000"
	got := hashResetToken(token)

	// must be 64 hex chars (SHA-256)
	if len(got) != 64 {
		t.Errorf("hashResetToken() length = %d; want 64", len(got))
	}

	// must be deterministic
	if got2 := hashResetToken(token); got2 != got {
		t.Errorf("hashResetToken() not deterministic: %q != %q", got2, got)
	}

	// must match a clean SHA-256
	sum := sha256.Sum256([]byte(token))
	want := hex.EncodeToString(sum[:])
	if got != want {
		t.Errorf("hashResetToken() = %q; want %q", got, want)
	}
}

func TestHashResetTokenDifferent(t *testing.T) {
	// different tokens must produce different hashes
	h1 := hashResetToken("token-a")
	h2 := hashResetToken("token-b")
	if h1 == h2 {
		t.Error("hashResetToken() produced same hash for different tokens")
	}
}