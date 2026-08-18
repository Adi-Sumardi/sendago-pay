package redis

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb       *redis.Client
	isMock    bool
	memLock   sync.Mutex
	memStore  map[string]string
	subscribers map[string][]chan string
}

func Connect(redisURL string) *Client {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("[Redis] Invalid URL (%s), fallback to memory-backed cache: %v", redisURL, err)
		return newMockClient()
	}

	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Ping failed, running in memory-backed mode: %v", err)
		return newMockClient()
	}

	log.Println("[Redis] Successfully connected to Redis")
	return &Client{rdb: rdb, isMock: false}
}

func newMockClient() *Client {
	return &Client{
		isMock:      true,
		memStore:    make(map[string]string),
		subscribers: make(map[string][]chan string),
	}
}

func (c *Client) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	if c.isMock {
		c.memLock.Lock()
		defer c.memLock.Unlock()
		if _, exists := c.memStore[key]; exists {
			return false, nil
		}
		c.memStore[key] = "1"
		go func() {
			time.Sleep(expiration)
			c.memLock.Lock()
			delete(c.memStore, key)
			c.memLock.Unlock()
		}()
		return true, nil
	}
	return c.rdb.SetNX(ctx, key, value, expiration).Result()
}

func (c *Client) Del(ctx context.Context, keys ...string) error {
	if c.isMock {
		c.memLock.Lock()
		defer c.memLock.Unlock()
		for _, k := range keys {
			delete(c.memStore, k)
		}
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}

func (c *Client) Publish(ctx context.Context, channel string, message interface{}) error {
	if c.isMock {
		c.memLock.Lock()
		defer c.memLock.Unlock()
		msgStr, ok := message.(string)
		if !ok {
			msgStr = "updated"
		}
		if subs, exists := c.subscribers[channel]; exists {
			for _, ch := range subs {
				select {
				case ch <- msgStr:
				default:
				}
			}
		}
		return nil
	}
	return c.rdb.Publish(ctx, channel, message).Err()
}

func (c *Client) SubscribeChannel(ctx context.Context, channel string) chan string {
	msgChan := make(chan string, 10)
	if c.isMock {
		c.memLock.Lock()
		c.subscribers[channel] = append(c.subscribers[channel], msgChan)
		c.memLock.Unlock()
		return msgChan
	}

	pubsub := c.rdb.Subscribe(ctx, channel)
	go func() {
		defer pubsub.Close()
		ch := pubsub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				msgChan <- msg.Payload
			}
		}
	}()

	return msgChan
}
