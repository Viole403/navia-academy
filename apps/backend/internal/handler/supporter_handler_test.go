package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
)

func TestVerifyHMAC(t *testing.T) {
	secret := "test-secret"
	body := []byte(`{"id":"tx-1","amount":50000}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	validSig := hex.EncodeToString(mac.Sum(nil))

	tests := []struct {
		name      string
		signature string
		want      bool
	}{
		{"valid signature", validSig, true},
		{"valid signature with whitespace", "  " + validSig + "  ", true},
		{"empty signature", "", false},
		{"tampered body", hex.EncodeToString(mac.Sum([]byte("x"))), false},
		{"wrong secret", hex.EncodeToString(hmacSHA256([]byte("other"), body)), false},
		{"garbage", "not-a-hex-signature", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := verifyHMAC(tt.signature, body, secret); got != tt.want {
				t.Errorf("verifyHMAC() = %v; want %v", got, tt.want)
			}
		})
	}
}

func TestParseAmount(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    float64
		wantErr bool
	}{
		{"plain number", "50000", 50000, false},
		{"decimal", "12.50", 12.50, false},
		{"comma as decimal (IDR)", "12,50", 12.50, false},
		{"currency prefix", "Rp 50.000", 50.000, false},
		{"comma is decimal separator, not thousands", "50,000", 50.000, false}, // "50.000" parses as 50
		{"empty", "", 0, true},
		{"just dot", ".", 0, true},
		{"no digits", "abc", 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseAmount(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseAmount(%q) = %v; want error", tt.raw, got)
				}
				return
			}
			if err != nil {
				t.Errorf("parseAmount(%q) unexpected error: %v", tt.raw, err)
				return
			}
			if got != tt.want {
				t.Errorf("parseAmount(%q) = %v; want %v", tt.raw, got, tt.want)
			}
		})
	}
}

func TestOptionalString(t *testing.T) {
	if v := optionalString(""); v != nil {
		t.Errorf("optionalString(\"\") = %v; want nil", v)
	}
	if v := optionalString("   "); v != nil {
		t.Errorf("optionalString(\"   \") = %v; want nil", v)
	}
	v := optionalString("hello")
	if v == nil || *v != "hello" {
		t.Errorf("optionalString(\"hello\") = %v; want pointer to \"hello\"", v)
	}
}

func hmacSHA256(key, data []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write(data)
	return mac.Sum(nil)
}

func TestVerifyHMACConstantTimePath(t *testing.T) {
	// ensure the comparison path doesn't panic on odd input shapes
	body := []byte(`{}`)
	_ = strings.TrimSpace("")
	if verifyHMAC(strings.Repeat("0", 64), body, "s") {
		t.Error("all-zero signature should not validate")
	}
}
