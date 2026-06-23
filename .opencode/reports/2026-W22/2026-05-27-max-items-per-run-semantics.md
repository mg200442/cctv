# Max Items Per Run Semantics Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Updated auto-advance instructions so `Max Items Per Run` is interpreted as the number
of approved queue items that may execute per invocation.

## Changes

- Updated queue semantics for `Max Items Per Run`; the active queue now lives in
  `.opencode/project-status.md`.
- Updated `.opencode/commands/auto-advance.md` to select up to the configured number
  of approved items by ascending `Order`.
- Updated `.opencode/agents/orchestrator.md` and `.opencode/AGENTS.md` to require a
  report and Git handoff between items.
- Recorded ADR 003 for the batch execution semantics.

## Verification

- Searched for old wording that forced exactly one approved item per invocation.
- Confirmed the remaining one-item language is limited to commands that intentionally
  implement a single slice or Gate 6 scope.
