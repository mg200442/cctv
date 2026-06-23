# ADR 010: Context-First Design Handoff

Date: 2026-05-29

## Status

Accepted

## Context

The previous design handoff scaffold prescribed `web/`, `tablet/`, `mobile/`, and
`references/` folders. That created organizational work before the actual design
intent was clear.

## Decision

Use a context-first design handoff.

`.opencode/design-handoff/` has no required folder structure. The required artifact is
`.opencode/design-handoff/context.md`, which explains the app, design objective,
screens, flows, functionality, states, responsive rules, components, interactions,
data/API needs, accessibility, exact requirements, adaptable details, and open
questions.

Supporting design files may be placed directly in the folder in whatever structure is
convenient.

## Consequences

- OpenCode starts from design intent instead of folder organization.
- Gate 2 and Gate 3 use `context.md` as the design source of truth.
- External HTML/CSS, screenshots, exports, and assets remain reference material unless
  explicitly approved for direct reuse.
