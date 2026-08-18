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

// AllocateUniqueCode finds an available 3-digit unique code (between 100 and 999)
// and reserves it for the duration of the transaction (e.g. 30 minutes)
func (g *Generator) AllocateUniqueCode(ctx context.Context, baseAmount int64, duration time.Duration) (int, error) {
	rand.Seed(time.Now().UnixNano())

	// Try up to 50 random attempts to find an unreserved unique code for this base amount
	for attempt := 0; attempt < 50; attempt++ {
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

	// Fallback to sequential scanning if random collisions occur
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

	return 0, fmt.Errorf("no unique codes available for amount %d", baseAmount)
}

// ReleaseUniqueCode releases the lock when transaction is paid or cancelled
func (g *Generator) ReleaseUniqueCode(ctx context.Context, baseAmount int64, code int) error {
	lockKey := fmt.Sprintf("uniquecode:%d:%d", baseAmount, code)
	return g.rdb.Del(ctx, lockKey)
}
