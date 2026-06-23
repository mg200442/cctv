# ADR 006: Single Project Status Dashboard

Date: 2026-05-27

## Status

Accepted

## Context

The workflow had several status and planning files: current sprint, approval queue,
implementation plan, backlog, roadmap, slice files, reports, and open questions. That
made it difficult for the project owner to know where the project stood and what to
approve next.

## Decision

Use `.opencode/project-status.md` as the single user-facing operational dashboard.

The dashboard contains:

- Automation settings.
- Current state.
- Decision needed from the user.
- Next actions queue.
- Active slices.
- Completed work.
- Change log.

`.opencode/open-questions.md` remains the dedicated place for questions. If a
question blocks a gate, slice, or action, the dashboard must reference it with
`Blocked By: Q-XXX`.

Supporting files such as slice details, backlog, roadmap, implementation plan, and
reports may still exist, but agents must not require the user to inspect them to know
the current state or next action.

## Consequences

- The user has one primary file to inspect and edit for approvals.
- Auto-advance reads approved work from the dashboard queue.
- Complex work can still be split into slices, but the slice list and statuses are
  visible in the dashboard.
- Agents must update the dashboard whenever state, blockers, next actions, or slice
  statuses change.
