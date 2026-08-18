# ADR 002: One Postgres instance, one logical database per service

Six services own Postgres data (identity, merchant, payment, invoice, notification,
settlement). Each gets its own logical database (`identity`, `merchant`, `payment`, ...)
on one shared Postgres 16 container (`infra/postgres-init/001-create-databases.sh`
creates them on first boot), rather than six separate Postgres instances.

**Why**: at Fase-1 scale, six Postgres containers is pure operational overhead — more
memory, more connection pools to tune, more backup jobs — with no corresponding
benefit, since no service is anywhere near needing independent scaling of its database.
Separate logical databases (not just separate schemas) still gives each service a hard
boundary: no service can accidentally query another's tables, migrations are fully
independent, and the eventual move to separate instances is "point DATABASE_URL at a
new host," not a schema migration.

**Revisit when**: a specific service's data volume or query load genuinely needs
independent scaling or a different Postgres configuration (e.g. reporting-service-style
analytics queries starting to compete with payment-service's transactional workload —
though reporting already avoids this by living in ClickHouse instead, see ADR 004).
