# ADR 002: Git Bootstrap Permissions

Date: 2026-05-27

## Status

Accepted

## Context

Agents should be able to initialize Git when a workspace has not been set up yet,
without repeatedly asking for shell approval. Routine Git lifecycle ownership is
defined separately by later ADRs.

## Decision

All agents may run the minimum Git bootstrap commands needed to detect or initialize
a repository: `git`, `git rev-parse *`, `git status *`, and `git init *`.

Specialists remain restricted from broader Git lifecycle operations unless a dedicated
Git agent owns that responsibility.

The `manage-git` skill now starts by checking whether the workspace is a Git repository
and initializes one with `git init` when needed.

## Consequences

- Missing repositories can be initialized by whichever agent first needs Git.
- Broader Git workflows can be delegated according to the active Git lifecycle policy.
- Non-bootstrap Git commands by specialists remain denied or ask according to each
  specialist's normal shell policy.
- Non-Git shell commands still follow each agent's existing approval policy.
- Destructive Git operations remain governed by the `manage-git` safety rules.
