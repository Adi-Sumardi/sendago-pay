package totp

import (
	"strings"
	"testing"
	"time"
)

func TestTOTPGenerationAndValidation(t *testing.T) {
	secret, err := GenerateSecret()
	if err != nil {
		t.Fatalf("GenerateSecret failed: %v", err)
	}

	if len(secret) < 16 {
		t.Fatalf("Expected base32 secret length >= 16, got %s (len %d)", secret, len(secret))
	}

	otpAuthURL := GenerateOTPAuthURL("SendaGo Pay", "admin@sendago.pay", secret)
	if !strings.HasPrefix(otpAuthURL, "otpauth://totp/") {
		t.Fatalf("Expected otpauth URL, got %s", otpAuthURL)
	}

	code, err := GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("GenerateCode failed: %v", err)
	}

	if len(code) != 6 {
		t.Fatalf("Expected 6-digit code, got %s", code)
	}

	if !ValidateCode(secret, code) {
		t.Fatalf("ValidateCode returned false for valid code %s", code)
	}

	if ValidateCode(secret, "000000") && code != "000000" {
		t.Fatalf("ValidateCode should fail on wrong code")
	}
}
