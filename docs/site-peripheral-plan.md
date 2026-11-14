# Historical peripheral proposal — superseded

Git history preserves the exploratory proposal for integer IDs, time-window
deduplication, and age-based deletion. Use the current runbook for operating
instructions.

- [Site operations](site-operations.md) covers configuration, operator commands,
  intake recovery, and cutover.
- [Hosting and CI configuration](hosting-ci-cd-gh-pages-setup.md) shows which
  builds enable intake.
- [Architecture](architecture.md) describes request and delivery contracts.
- [Readiness](readiness.md) tracks outstanding acceptance work.

The Cloudflare implementation uses UUIDs with a canonical payload hash,
separate inquiry and notification lifecycles, an immutable database environment
marker, and authenticated operator actions. Notification recovery and any
retention work are operator tasks.
