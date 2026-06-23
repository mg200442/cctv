# ADR 008: Bootstrap and Conversational Task Intake

Date: 2026-05-27

## Status

Accepted

## Context

The workflow needs to support both brand-new products and existing applications with
many incoming features, bugs, and operational tasks. The user should not need to
memorize command arguments to add work.

## Decision

Add `/bootstrap-workspace` for virgin workspaces and `/add-task` for conversational
task intake.

When the dashboard is uninitialized, the orchestrator must bootstrap before gates,
slices, or implementation.

`/add-task` asks for missing details conversationally, creates or updates a workstream
in `.opencode/project-status.md`, adds questions to `.opencode/open-questions.md`
when needed, and marks ready next actions as `Needs Approval`.

## Consequences

- New projects get broad discovery across product, UX, frontend, backend, API,
  database, security, testing, and infra/devops.
- Existing applications get repository analysis, including test detection.
- Bootstrap records whether design input files are waiting in `.opencode/design-handoff/`
  and recommends `/prepare-design-handoff` when appropriate.
- Incoming Asana/Jira/GitHub tickets can be pasted without memorizing fields.
- The dashboard remains the operational source of truth for workstreams and next
  actions.
