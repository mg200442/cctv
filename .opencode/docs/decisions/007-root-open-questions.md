# ADR 007: Root Open Questions File

Date: 2026-05-27

## Status

Accepted

## Context

The project owner needs quick access to both the project dashboard and the question
inbox. Keeping questions under `.opencode/docs/` made the two primary user-facing
files live at different levels.

## Decision

Move the questions inbox to `.opencode/open-questions.md`, alongside
`.opencode/project-status.md`.

## Consequences

- The two primary user-facing files are adjacent and easier to find.
- Agents must write unresolved questions to `.opencode/open-questions.md`.
- Dashboard blockers still reference questions with `Blocked By: Q-XXX`.
