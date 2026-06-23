# ADR 005: Gate 0 and Gate 1 Question Capture

Date: 2026-05-27

## Status

Accepted

## Context

Gate 0 and Gate 1 are the best points to expose missing product and technical context
before design, architecture, or implementation work starts.

## Decision

Gate 0 and Gate 1 must capture relevant product and technical questions in
`.opencode/open-questions.md`.

Each question must include a blank fenced `User Answer` area so the project owner can
answer directly in the file.

## Consequences

- Later gates can stop on known unresolved questions instead of discovering them late.
- User answers remain next to the original question and context.
- Resolved questions stay traceable for architecture, planning, and implementation.
