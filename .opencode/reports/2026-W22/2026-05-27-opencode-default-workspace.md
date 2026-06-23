# OpenCode Default Workspace Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Moved the OpenCode template into `.opencode/` and updated internal references to
the default workspace path.

## Changes

- Created `.opencode/` as the workspace root.
- Moved agents, commands, skills, gates, docs, tasks, reports, reviews, design handoff,
  model profiles, README, AGENTS instructions, and base project config into `.opencode/`.
- Updated `opencode.project.json` to load instructions and skills from `.opencode/`.
- Updated README and workflow templates to reference `.opencode/`.
- Recorded the workspace naming decision in ADR 001.

## Verification

- Searched the workspace for the old versioned workspace path.
- Confirmed no old-path references remain.
