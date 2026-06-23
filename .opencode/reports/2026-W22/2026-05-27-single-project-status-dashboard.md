# Single Project Status Dashboard Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Restructured the workflow around `.opencode/project-status.md` as the single
user-facing status, approval, and next-action dashboard.

## Changes

- Added `.opencode/project-status.md` with automation settings, current state, decision
  needed, next actions queue, active slices, completed work, and change log.
- Updated global and orchestrator instructions to require dashboard updates whenever
  state, blockers, approvals, next actions, or slice statuses change.
- Updated auto-advance to read approved work from `.opencode/project-status.md`.
- Marked `current-sprint.md` and `approved_next_slice.md` as compatibility files.
- Updated Gate 0-7 and slice planning/implementation commands to maintain the dashboard.
- Gave planning/review specialists permission to update `.opencode/project-status.md`.
- Recorded ADR 006.

## Verification

- Checked gate, command, skill, and agent references for old queue/status assumptions.
- Confirmed auto-advance now selects approved items from the dashboard.
- Confirmed `open-questions.md` remains the place for questions and dashboard blockers
  reference question IDs.
