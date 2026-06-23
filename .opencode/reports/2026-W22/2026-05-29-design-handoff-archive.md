# Design Handoff Archive Update

Date: 2026-05-29
Type: OpenCode customization

## Summary

Changed design handoff handling to an inbox/archive model.

## Changes

- Added `.opencode/design-handoff/archive/`.
- Added handoff metadata to `.opencode/design-handoff/context.md`.
- Added `Design Handoffs` index to `.opencode/project-status.md`.
- Added `/prepare-design-handoff`.
- Added `prepare-design-handoff` skill.
- Updated design handoff README, global instructions, and task intake guidance.
- Added a rule that no processing happens when the inbox has no design input files.
- Added a rule that processed packages are archived under `archive/DH-XXX/` and
  `context.md` is reset afterward.
- Recorded ADR 011.

## Verification

- Confirmed inbox context and archive folder exist.
- Confirmed project dashboard has a handoff index.
- Confirmed `/prepare-design-handoff` includes no-design guard and archive/reset rules.
