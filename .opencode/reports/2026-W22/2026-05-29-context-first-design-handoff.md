# Context-First Design Handoff Update

Date: 2026-05-29
Type: OpenCode customization

## Summary

Simplified `.opencode/design-handoff/` so it uses a required `context.md` instead of
predefined web/tablet/mobile/reference folders.

## Changes

- Removed predefined handoff folders and placeholder files.
- Added `.opencode/design-handoff/context.md`.
- Rewrote `.opencode/design-handoff/README.md` with required context fields and an
  extraction prompt for preparing the handoff before OpenCode implementation.
- Updated Gate 2, Gate 3, UX, design-system, frontend, visual mockup skill, README,
  and AGENTS references to use `context.md`.
- Recorded ADR 010.

## Verification

- Confirmed `.opencode/design-handoff/` only contains `README.md` and `context.md`.
- Searched for old predefined folder references.
- Confirmed remaining design-handoff references point to `context.md` or generic
  supporting files.
