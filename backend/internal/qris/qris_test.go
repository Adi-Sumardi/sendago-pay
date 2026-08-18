package qris

import (
	"strings"
	"testing"
)

func TestCalculateCRC16(t *testing.T) {
	// Standard EMVCo test vector
	sample := "00020101021226590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI52045411530336054061502475802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A016304"
	crc := CalculateCRC16(sample)
	if len(crc) != 4 {
		t.Fatalf("Expected 4-character hex CRC, got %s (len %d)", crc, len(crc))
	}
}

func TestGenerateDynamicQRIS(t *testing.T) {
	staticQR := "00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E"

	amount := int64(150247)
	dynamicQR, err := GenerateDynamicQRIS(staticQR, amount)
	if err != nil {
		t.Fatalf("Failed to generate dynamic QRIS: %v", err)
	}

	// Verify Tag 01 is changed to 12 (Dynamic)
	if !strings.Contains(dynamicQR, "010212") {
		t.Errorf("Expected Point of Initiation to be dynamic (010212), got %s", dynamicQR)
	}

	// Verify Tag 54 (Amount: 5406150247) is present
	if !strings.Contains(dynamicQR, "5406150247") {
		t.Errorf("Expected Tag 5406150247 in payload, got %s", dynamicQR)
	}

	// Verify ends with 6304 and 4 hex chars
	if !strings.Contains(dynamicQR, "6304") {
		t.Errorf("Expected Tag 6304 at the end, got %s", dynamicQR)
	}

	// Verify CRC validity
	idx := strings.LastIndex(dynamicQR, "6304")
	calculatedCRC := CalculateCRC16(dynamicQR[:idx+4])
	actualCRC := dynamicQR[idx+4:]
	if calculatedCRC != actualCRC {
		t.Errorf("CRC mismatch: calculated %s != actual %s", calculatedCRC, actualCRC)
	}
}
