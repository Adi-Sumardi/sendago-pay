package qris

import (
	"fmt"
	"strconv"
	"strings"
)

// CalculateCRC16 calculates CRC-16/CCITT-FALSE checksum for EMVCo QRIS payload
// Polynomial: 0x1021, Initial: 0xFFFF
func CalculateCRC16(data string) string {
	crc := uint16(0xFFFF)
	for i := 0; i < len(data); i++ {
		crc ^= uint16(data[i]) << 8
		for j := 0; j < 8; j++ {
			if (crc & 0x8000) != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc = crc << 1
			}
		}
	}
	return fmt.Sprintf("%04X", crc)
}

// GenerateDynamicQRIS injects Tag 54 (Amount) into a static EMVCo QRIS string and recalculates CRC16
func GenerateDynamicQRIS(staticQRIS string, amount int64) (string, error) {
	if len(staticQRIS) < 10 {
		return "", fmt.Errorf("invalid static QRIS string: too short")
	}

	// 1. Remove existing Tag 63 (CRC) if present at the end
	cleanQR := staticQRIS
	if idx := strings.LastIndex(cleanQR, "6304"); idx != -1 {
		cleanQR = cleanQR[:idx]
	}

	// 2. Change Point of Initiation (Tag 01) from Static (11) to Dynamic (12)
	// Tag 01 format: 010211 -> 010212
	cleanQR = strings.Replace(cleanQR, "010211", "010212", 1)

	// 3. Remove existing Tag 54 (Amount) if any
	// Parse TLV elements to safely remove old tag 54 if present
	cleanQR = removeTag(cleanQR, "54")

	// 4. Format Tag 54 (Amount)
	// Example: amount = 150247 -> value = "150247", len = 06 -> "5406150247"
	amountStr := strconv.FormatInt(amount, 10)
	amountLen := fmt.Sprintf("%02d", len(amountStr))
	tag54 := fmt.Sprintf("54%s%s", amountLen, amountStr)

	// 5. Inject Tag 54 before Tag 58 (Country Code "5802ID") or append before Tag 63
	var newPayload string
	if idx := strings.Index(cleanQR, "5802"); idx != -1 {
		newPayload = cleanQR[:idx] + tag54 + cleanQR[idx:]
	} else if idx := strings.Index(cleanQR, "5303"); idx != -1 {
		// Or after Tag 53 (Currency Code 5303360)
		endOf53 := idx + 7
		newPayload = cleanQR[:endOf53] + tag54 + cleanQR[endOf53:]
	} else {
		newPayload = cleanQR + tag54
	}

	// 6. Append Tag 63 header "6304"
	payloadToCRC := newPayload + "6304"

	// 7. Calculate CRC16 checksum
	crc := CalculateCRC16(payloadToCRC)

	// 8. Return final Dynamic QRIS string
	return payloadToCRC + crc, nil
}

// removeTag removes a specific 2-digit tag from an EMVCo string
func removeTag(raw string, targetTag string) string {
	var sb strings.Builder
	idx := 0
	length := len(raw)

	for idx+4 <= length {
		tag := raw[idx : idx+2]
		lenStr := raw[idx+2 : idx+4]
		valLen, err := strconv.Atoi(lenStr)
		if err != nil {
			// Fallback: append remaining and return
			sb.WriteString(raw[idx:])
			return sb.String()
		}

		endIdx := idx + 4 + valLen
		if endIdx > length {
			sb.WriteString(raw[idx:])
			return sb.String()
		}

		val := raw[idx+4 : endIdx]

		if tag != targetTag {
			sb.WriteString(tag)
			sb.WriteString(lenStr)
			sb.WriteString(val)
		}

		idx = endIdx
	}

	if idx < length {
		sb.WriteString(raw[idx:])
	}

	return sb.String()
}
