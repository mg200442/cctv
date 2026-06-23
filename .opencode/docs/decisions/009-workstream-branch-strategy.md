# ADR 009: Workstream Branch Strategy

Date: 2026-05-27

## Status

Accepted

## Context

Many features and bugfixes are developed on dedicated branches and pushed to GitHub.
The workflow needs to make branch choice explicit per workstream without requiring the
user to manage branch names manually.

## Decision

Each non-trivial workstream records a Git branch strategy in `.opencode/project-status.md`.

`/add-task` asks conversationally whether the workstream should use a new pushed branch,
a new local branch, the current branch, or decide later.

`/prepare-workstream-branch` creates or prepares the branch through `git-committer`.

Branch names follow workstream type and ID:

- Feature: `feature/ws-XXX-short-title`
- Bugfix: `bugfix/ws-XXX-short-title`
- Refactor: `refactor/ws-XXX-short-title`
- DevOps: `devops/ws-XXX-short-title`
- Security: `security/ws-XXX-short-title`
- Design: `design/ws-XXX-short-title`
- OpenCode Customization: `chore/opencode-XXX`

## Consequences

- Workstreams can map cleanly to GitHub branches and pull requests.
- Parallel work is safer because branch ownership is visible in the dashboard.
- `git-committer` can perform routine branch creation and upstream pushes, but must
  escalate ambiguous or risky branch operations.
