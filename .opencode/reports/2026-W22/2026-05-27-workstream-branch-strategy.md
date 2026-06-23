# Workstream Branch Strategy Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Added per-workstream Git branch strategy and a command to prepare workstream branches.

## Changes

- Added `/prepare-workstream-branch`.
- Added Git branch policy and branch templates to `.opencode/project-status.md`.
- Updated `/add-task` and the `add-task` skill to ask for branch preference
  conversationally.
- Updated `git-committer` permissions and rules for remotes, branch creation, and
  upstream pushes.
- Updated auto-advance to verify workstream branch alignment before executing.
- Recorded ADR 009.

## Verification

- Confirmed branch strategy fields exist in the dashboard.
- Confirmed `/add-task` does not require memorized branch variables.
- Confirmed `git-committer` must escalate force-pushes, unclear branch names, and
  ambiguous remote decisions.
