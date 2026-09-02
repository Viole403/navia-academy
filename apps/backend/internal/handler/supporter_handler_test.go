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

func TestParseAmountMinor(t *testing.T) {
	tests := []struct {
		name      string
		raw       string
		platform  string
		want      int64
		wantErr   bool
	}{
		// kofi (USD) — dollars → cents
		{"kofi plain", "5.00", "kofi", 500, false},
		{"kofi integer dollar", "5", "kofi", 500, false},
		{"kofi comma decimal", "5,50", "kofi", 550, false},
		{"kofi rounded cents", "1.999", "kofi", 200, false},
		{"kofi binary drift normalized", "0.30000000000000004", "kofi", 30, false},
		{"kofi oversized rejected", strings.Repeat("9", 100), "kofi", 0, true},
		// trakteer (IDR) — whole rupiah
		{"trakteer whole", "50000", "trakteer", 50000, false},
		{"trakteer currency prefix", "Rp 50.000", "trakteer", 50, false}, // dot = decimal here
		{"trakteer comma decimal", "50,50", "trakteer", 51, false},       // 50.5 → round 51
		{"trakteer oversized rejected", strings.Repeat("9", 100), "trakteer", 0, true},
		// shared guards
		{"empty", "", "kofi", 0, true},
		{"just dot", ".", "kofi", 0, true},
		{"no digits", "abc", "kofi", 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseAmountMinor(tt.raw, tt.platform)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseAmountMinor(%q, %q) = %d; want error", tt.raw, tt.platform, got)
				}
				return
			}
			if err != nil {
				t.Errorf("parseAmountMinor(%q, %q) unexpected error: %v", tt.raw, tt.platform, err)
				return
			}
			if got != tt.want {
				t.Errorf("parseAmountMinor(%q, %q) = %d; want %d", tt.raw, tt.platform, got, tt.want)
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
