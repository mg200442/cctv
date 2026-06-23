# Configure Models Command Update

Date: 2026-05-29
Type: OpenCode customization

## Summary

Added conversational model/provider configuration for OpenCode agents.

## Changes

- Added `/configure-models`.
- Added `configure-models` skill.
- Added `Model Policy` to `.opencode/project-status.md`.
- Updated bootstrap rules so new projects configure or defer model policy before Gate 0.
- Updated `model-profiles.md` with command behavior and agent assignment guidance.
- Updated orchestrator and global instructions.
- Recorded ADR 012.

## Verification

- Confirmed model configuration is approval-gated before file edits.
- Confirmed the command asks for providers and exact model IDs when needed.
- Confirmed new-project bootstrap includes model policy setup.
