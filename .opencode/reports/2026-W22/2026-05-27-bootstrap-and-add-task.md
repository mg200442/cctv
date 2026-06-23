# Bootstrap and Add Task Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Added virgin workspace bootstrap behavior and conversational task intake.

## Changes

- Added `/bootstrap-workspace`.
- Added `/add-task`.
- Added `bootstrap-workspace` and `add-task` skills.
- Extended `.opencode/project-status.md` with workspace context, repository analysis,
  design inbox status, and workstreams.
- Updated Gate 0 to require broad new-project discovery and existing-app repository
  analysis.
- Updated global and orchestrator rules to bootstrap uninitialized workspaces before
  gates, slices, or implementation.
- Recorded ADR 008.

## Verification

- Confirmed `/add-task` does not require memorized arguments.
- Confirmed uninitialized dashboards route to `/bootstrap-workspace`.
- Confirmed new-project and existing-application discovery rules are documented.
- Confirmed bootstrap checks for design input files but does not process them.
