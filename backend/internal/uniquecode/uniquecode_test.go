package uniquecode

import (
	"context"
	"sync"
	"testing"
	"time"

	"sendagopay-backend/internal/redis"
)

func TestAllocateAndReleaseUniqueCode(t *testing.T) {
	rdb := redis.Connect("memory")
	gen := NewGenerator(rdb)
	ctx := context.Background()

	baseAmount := int64(250000)

	// Allocate a code
	code1, err := gen.AllocateUniqueCode(ctx, baseAmount, 10*time.Minute)
	if err != nil {
		t.Fatalf("Failed to allocate code: %v", err)
	}
	if code1 < 100 || code1 > 9999 {
		t.Fatalf("Expected unique code between 100 and 9999, got %d", code1)
	}

	// Allocate second code for same base amount
	code2, err := gen.AllocateUniqueCode(ctx, baseAmount, 10*time.Minute)
	if err != nil {
		t.Fatalf("Failed to allocate second code: %v", err)
	}
	if code1 == code2 {
		t.Fatalf("Expected distinct unique codes, got same code: %d", code1)
	}

	// Release first code
	err = gen.ReleaseUniqueCode(ctx, baseAmount, code1)
	if err != nil {
		t.Fatalf("Failed to release code: %v", err)
	}
}

func TestConcurrentUniqueCodeAllocation(t *testing.T) {
	rdb := redis.Connect("memory")
	gen := NewGenerator(rdb)
	ctx := context.Background()

	baseAmount := int64(500000)
	concurrency := 30
	codes := make(map[int]bool)
	var mu sync.Mutex
	var wg sync.WaitGroup

	errCh := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			code, err := gen.AllocateUniqueCode(ctx, baseAmount, 5*time.Minute)
			if err != nil {
				errCh <- err
				return
			}

			mu.Lock()
			if codes[code] {
				t.Errorf("Duplicate code allocated: %d", code)
			}
			codes[code] = true
			mu.Unlock()
		}()
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			t.Fatalf("Concurrent allocation error: %v", err)
		}
	}

	if len(codes) != concurrency {
		t.Fatalf("Expected %d unique codes allocated, got %d", concurrency, len(codes))
	}
}
