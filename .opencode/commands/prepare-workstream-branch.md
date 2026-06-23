---
description: Create or prepare the Git branch for a workstream and optionally push it upstream.
agent: orchestrator
---

Prepare a Git branch for a workstream.

Rules:

- Read `.opencode/project-status.md` and identify the target workstream.
- If no workstream is provided, ask which workstream should get a branch.
- Confirm or infer branch strategy:
  - `New Branch + Push Upstream`
  - `New Local Branch`
  - `Current Branch`
  - `Decide Later`
- Use branch naming:
  - Feature: `feature/ws-XXX-short-title`
  - Bugfix: `bugfix/ws-XXX-short-title`
  - Refactor: `refactor/ws-XXX-short-title`
  - DevOps: `devops/ws-XXX-short-title`
  - Security: `security/ws-XXX-short-title`
  - Design: `design/ws-XXX-short-title`
  - OpenCode Customization: `chore/opencode-XXX`
- Delegate routine Git execution to `git-committer`.
- `git-committer` must check the current branch, remotes, and worktree cleanliness before creating or switching branches.
- Do not switch or create branches when the worktree has unrelated or ambiguous changes.
- Do not force push.
- Update `.opencode/project-status.md` with branch strategy, branch name, base branch, remote, PR expectation, and push policy.
- Create a report under `.opencode/reports/YYYY-Www/`.

Arguments are optional context only:

`$ARGUMENTS`
