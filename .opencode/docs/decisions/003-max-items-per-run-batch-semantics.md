# ADR 003: Max Items Per Run Batch Semantics

Date: 2026-05-27

## Status

Accepted

## Context

Auto-advance uses `.opencode/project-status.md` to decide which approved queue items
may run. `Max Items Per Run` should define how many approved items can run in one
invocation, not force all invocations to a single item.

## Decision

`Max Items Per Run` is a positive integer limit. Auto-advance selects up to that many
items with `Status` set to `Approved`, ordered by ascending `Order`.

Items run sequentially. Each item must complete its own report and Git handoff before
the next item starts.

## Consequences

- A value of `1` runs one approved item.
- A value of `2` runs the first approved item, completes report and Git handoff, then
  runs the second approved item.
- Blocked work stops the invocation at the blocked item so later approved items are
  not started on top of unresolved context.
