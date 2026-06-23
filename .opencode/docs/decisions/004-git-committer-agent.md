# ADR 004: Dedicated Git Committer Agent

Date: 2026-05-27

## Status

Accepted

## Context

Routine Git work is frequent, mechanical, and usually lower risk than product,
architecture, implementation, or security reasoning. It is a good fit for a lower-cost
specialist, as long as risky operations escalate instead of being handled blindly.

## Decision

Add `git-committer` as the dedicated routine Git operator.

`git-committer` may handle repository bootstrap, status and diff review, staging,
commits, routine pushes, safe branch movement, fast-forward merges, clean rebases,
and non-destructive resets.

`git-committer` must escalate to the orchestrator for conflicts, destructive
operations, force pushes, non-fast-forward merges, hard resets, branch/tag/release
decisions, ambiguous ownership, or anything requiring code/domain judgment.

The orchestrator remains responsible for coordinating escalation and delegating
conflict resolution to the relevant specialist when needed.

## Consequences

- Routine Git work can use a lower-cost model.
- The orchestrator spends less time on mechanical repository operations.
- Risky Git situations still route through orchestration and appropriate specialists.
