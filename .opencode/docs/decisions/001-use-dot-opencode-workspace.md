# ADR 001: Use `.opencode` as the Default Workspace

Date: 2026-05-27

## Status

Accepted

## Context

The OpenCode operating system template previously used a versioned isolated
workspace name. The desired default structure is the native `.opencode` folder.

## Decision

All OpenCode-owned artifacts will live under `.opencode/`, and all internal references
will point to `.opencode/`.

## Consequences

- OpenCode can discover agents, commands, and skills from the default `.opencode/` path.
- Workflow artifacts, reports, decisions, tasks, and handoff files remain isolated from
  application files.
- The old versioned workspace path is no longer referenced by the template.
