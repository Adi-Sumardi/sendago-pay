# ADR 004: Kafka, not RabbitMQ — and every service consumer, not a chained pipeline

The architecture doc lists "Kafka / RabbitMQ" as alternatives; this build uses Kafka
throughout (`segmentio/kafka-go`, pure Go, no cgo/librdkafka dependency) since the doc's
own Recommended Tech Stack table names Kafka specifically, and multiple independent
consumers (payment-service, notification-service, settlement-service, reporting-service,
plus the four skeleton services) reading the same `payment.*` event stream is exactly
Kafka's consumer-group model, not a work-queue model.

**Event flow is fan-out, not a chain**: webhook-service normalizes a Midtrans
notification once and publishes to `payment.*` topics. Every interested service
(payment-service for status, notification-service for merchant callbacks + email,
settlement-service for the ledger, reporting-service for analytics, and the four
skeletons) consumes directly from that same topic — nothing re-publishes a derived
event. This keeps the event contract (`internal/events.PaymentEvent`) as the single
source of truth for what "a payment succeeded" means across the system.

**Idempotency**: Kafka's at-least-once delivery means every consumer must tolerate
redelivery. payment-service's status transitions are forward-only and no-op on repeat;
settlement-service's ledger credit is guarded by a unique constraint on
`(transaction_id)` for credit entries; reporting-service's ClickHouse insert is
explicitly documented as best-effort/not-idempotent (acceptable for a summary view, not
a financial record — see the comment in `internal/reporting/consumer.go`).
