# Git Committer Agent Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Added a dedicated `git-committer` subagent for routine Git operations and updated the
workflow so risky Git situations escalate to the orchestrator.

## Changes

- Added `.opencode/agents/git-committer.md` with a lower-cost model override.
- Granted `git-committer` routine Git permissions for status, diffs, staging, commits,
  normal pushes, safe branch movement, fast-forward merges, clean rebases, and
  non-destructive resets.
- Updated the orchestrator to delegate routine Git work to `git-committer`.
- Updated auto-advance and implementation commands to use `git-committer` for fallback
  commits and handoff commits.
- Updated `manage-git` and model profile guidance.
- Recorded ADR 004.

## Verification

- Confirmed the orchestrator can delegate to `git-committer`.
- Confirmed `git-committer` has explicit escalation rules for conflicts and destructive
  operations.
- Confirmed previous Git bootstrap ADR no longer claims the orchestrator owns all
  lifecycle work.
