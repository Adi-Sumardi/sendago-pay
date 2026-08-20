package uniquecode

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"sendagopay-backend/internal/redis"
)

type Generator struct {
	rdb *redis.Client
}

func NewGenerator(rdb *redis.Client) *Generator {
	return &Generator{rdb: rdb}
}

// AllocateUniqueCode finds an available unique code (default 3-digit 100-999, expanding to 4-digit 1000-9999 if full)
// and reserves it for the duration of the transaction.
func (g *Generator) AllocateUniqueCode(ctx context.Context, baseAmount int64, duration time.Duration) (int, error) {
	rand.Seed(time.Now().UnixNano())

	// Phase 1: Try 60 random attempts for 3-digit code (100..999)
	for attempt := 0; attempt < 60; attempt++ {
		code := rand.Intn(900) + 100 // 100 .. 999
		lockKey := fmt.Sprintf("uniquecode:%d:%d", baseAmount, code)

		ok, err := g.rdb.SetNX(ctx, lockKey, "locked", duration)
		if err != nil {
			return 0, err
		}
		if ok {
			return code, nil
		}
	}

	// Phase 2: Sequential scanning 3-digit code
	for code := 100; code <= 999; code++ {
		lockKey := fmt.Sprintf("uniquecode:%d:%d", baseAmount, code)
		ok, err := g.rdb.SetNX(ctx, lockKey, "locked", duration)
		if err != nil {
			return 0, err
		}
		if ok {
			return code, nil
		}
	}

	// Phase 3: Dynamic high-concurrency expansion to 4-digit code (1000..9999)
	for attempt := 0; attempt < 50; attempt++ {
		code := rand.Intn(9000) + 1000 // 1000 .. 9999
		lockKey := fmt.Sprintf("uniquecode:%d:%d", baseAmount, code)
		ok, err := g.rdb.SetNX(ctx, lockKey, "locked", duration)
		if err != nil {
			return 0, err
		}
		if ok {
			return code, nil
		}
	}

	return 0, fmt.Errorf("no unique codes available for amount %d (pool exhausted)", baseAmount)
}

// ReleaseUniqueCode releases the lock when transaction is paid or cancelled
func (g *Generator) ReleaseUniqueCode(ctx context.Context, baseAmount int64, code int) error {
	if code <= 0 {
		return nil
	}
	lockKey := fmt.Sprintf("uniquecode:%d:%d", baseAmount, code)
	return g.rdb.Del(ctx, lockKey)
}
