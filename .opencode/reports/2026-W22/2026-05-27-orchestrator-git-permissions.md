# Git Bootstrap Permission Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Granted all agents the minimum Git bootstrap permissions needed to initialize a
missing repository. Broader Git lifecycle ownership is superseded by ADR 004, which
delegates routine Git execution to `git-committer`.

## Changes

- Updated `.opencode/agents/orchestrator.md` so `git` and `git *` are allowed while
  other bash commands still ask.
- Updated specialist agents so `git`, `git rev-parse *`, `git status *`, and
  `git init *` are allowed without changing their normal shell policy for other
  commands.
- Updated `.opencode/skills/manage-git/SKILL.md` to check repo state and run
  `git init` when needed.
- Updated `.opencode/AGENTS.md` to document Git initialization behavior.
- Recorded the permission decision in ADR 002.

## Verification

- Reviewed agent permission blocks.
- Confirmed the Git workflow now includes repository initialization.
- Attempted to initialize Git in this workspace, but filesystem permissions blocked
  creating `.git`; elevated execution was not approved.
