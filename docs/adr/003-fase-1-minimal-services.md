# ADR 003: Six of thirteen services are Fase-1 minimal or skeleton, not full

The architecture doc's own Product Roadmap phases functionality: Fase 1 is Payment
Link, Invoice, QRIS, Dashboard, Webhook. Fase 2 is multi-provider/routing/refund/
settlement. Fase 3 is wallet/split/escrow/subscriptions. Fase 4 is fraud AI/multi-
currency/SDKs. This build honors that phasing at the service level:

- **Full Fase-1 services**: identity, merchant, payment, invoice, webhook,
  notification.
- **Fase-1-minimal** (real, running, but deliberately narrow): settlement-service is a
  credit-only ledger with no fees/taxes/payout; reporting-service is one ClickHouse
  table fed by `payment.success` with one summary endpoint.
- **Skeleton** (real process, migrated if it has a DB, Kafka-wired, health-checked, but
  no business logic yet): wallet-service (Fase 3), fraud-service (Fase 4),
  reconciliation-service (Fase 2), billing-service (Fase 4/ecosystem).

**Why build skeletons at all instead of just not creating them yet**: the user
explicitly asked for all 13 services separated from day one, as the architectural
foundation other SendaGo products will build on. A skeleton that's a real container with
a real health check and a real Kafka subscription is meaningfully different from a
service that doesn't exist — it proves the deployment topology, the Kafka event
contract, and the inter-service boundary all work end-to-end for that service, so
scoping in its Fase 2-4 business logic later is additive, not a new integration.

**What "skeleton" means concretely**: see `internal/wallet/service.go` for the pattern
all four follow — `Routes()` exposing `/healthz`, `StartConsumer()` subscribing to a
plausible topic and logging receipt. No database migrations exist for these four yet
since they have no data to persist.
