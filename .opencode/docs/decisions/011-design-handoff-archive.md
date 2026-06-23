# ADR 011: Design Handoff Archive

Date: 2026-05-29

## Status

Accepted

## Context

Multiple features may arrive with their own designs. Reusing a single active
`context.md` without archiving creates a risk of overwriting analyzed or approved
design intent.

## Decision

Use `.opencode/design-handoff/` as a temporary inbox. Archive processed handoff
packages under `.opencode/design-handoff/archive/DH-XXX/`.

Add `/prepare-design-handoff` to process the inbox, generate or use `context.md`,
extract implementation-relevant information, archive the package, and reset
`context.md`.

Track handoffs in `.opencode/project-status.md` under `Design Handoffs`.

## Consequences

- The incoming design package remains easy to process.
- Historical analyzed and approved handoff packages are preserved.
- New designs can be associated with workstreams without mixing unrelated feature
  designs.
- Empty handoff folders are not processed.
