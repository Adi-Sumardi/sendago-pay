package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// GenerateSecret creates a new random 20-byte Base32 secret for TOTP (RFC 6238)
func GenerateSecret() (string, error) {
	bytes := make([]byte, 20)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes), nil
}

// GenerateOTPAuthURL creates a standard otpauth:// URI for Google Authenticator / Authy
func GenerateOTPAuthURL(issuer, accountName, secret string) string {
	encodedIssuer := url.QueryEscape(issuer)
	encodedAccount := url.QueryEscape(accountName)
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
		encodedIssuer, encodedAccount, secret, encodedIssuer)
}

// GenerateCode calculates the 6-digit TOTP code for a given timestamp
func GenerateCode(secret string, t time.Time) (string, error) {
	secret = strings.ToUpper(strings.TrimSpace(secret))
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		// Try with standard padding
		key, err = base32.StdEncoding.DecodeString(secret)
		if err != nil {
			return "", fmt.Errorf("invalid base32 secret: %v", err)
		}
	}

	counter := uint64(t.Unix() / 30)
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)

	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	code := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7fffffff
	code = code % 1000000

	return fmt.Sprintf("%06d", code), nil
}

// ValidateCode checks if a user-supplied 6-digit code matches the secret (allows +/- 2 steps for clock drift)
func ValidateCode(secret, code string) bool {
	code = strings.TrimSpace(code)
	if len(code) != 6 {
		return false
	}

	now := time.Now()
	// Check window: T-60s, T-30s, T, T+30s, T+60s
	windows := []time.Time{
		now.Add(-60 * time.Second),
		now.Add(-30 * time.Second),
		now,
		now.Add(30 * time.Second),
		now.Add(60 * time.Second),
	}

	for _, t := range windows {
		expected, err := GenerateCode(secret, t)
		if err == nil && expected == code {
			return true
		}
	}

	return false
}
