# ADR-0004 — Secret data is filtered server-side, never transmitted
Accepted. One visibility function (contracts play/visibility.ts) is the choke point for events, snapshots, HTTP responses, and AI context recipes. dm_only data never reaches a player client in any payload. Wire-capture tests enforce it. Rejected: client-side hiding (one devtools away from a spoiled campaign).
