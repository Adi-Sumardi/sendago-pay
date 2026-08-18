# ADR 001: One Go module, thirteen deployables

The architecture calls for 13 independent microservices from day one. Rather than 13
separate `go.mod` files (13x the dependency-management overhead — version drift across
services, 13 separate `go mod tidy` runs, 13 separate vulnerability surfaces to track),
`services/` is a single Go module with 13 `cmd/<service>/main.go` entrypoints, each
built into its own Docker image via its own `Dockerfile` (`services/cmd/<service>/Dockerfile`).

**What's preserved**: independent deployability (13 containers, 13 Kubernetes
Deployments eventually), independent scaling, no direct cross-service database access
(every cross-service call is REST or Kafka — see ADR 002 and ADR 003), and one
`internal/<domain>` package per service so ownership boundaries are as clear as if they
were separate modules.

**What's simplified**: one shared `go.sum`, one `go build`/`go test ./...` for the whole
system, one place dependency upgrades happen.

**Revisit when**: a specific service's dependency needs diverge enough from the rest
(e.g. it needs a Go version bump the others can't take yet) that shared `go.sum` becomes
a real blocker — splitting a `cmd/<service>` into its own module at that point is
mechanical, not a redesign.
