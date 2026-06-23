# Prepared Design Fidelity Rules

- Reported At: 2026-06-05 16:33 Europe/London
- Type: OpenCode Customization
- Status: Completed

## Summary

Strengthened the OpenCode workflow so prepared designs are treated as approved implementation contracts after Gate 3, with explicit technology mapping and fidelity verification.

## Work Completed

- Added prepared-design fidelity rules to global agent instructions, orchestrator behavior, design gates, slice planning, implementation command, handoff context, and slice template.
- Added guidance to use many small vertical slices when that improves faithful implementation of complex designs.

## Decisions

- Prepared design handoffs must be studied before architecture, slicing, or implementation.
- Named technologies, frameworks, component libraries, exported code, and asset constraints must be implemented or documented as approved deviations.
- Design fidelity requirements belong in slice acceptance and verification, not only in a final polish task.

## Files Changed

- `.opencode/AGENTS.md`
- `.opencode/README.md`
- `.opencode/agents/orchestrator.md`
- `.opencode/gates/gate-2-design.md`
- `.opencode/gates/gate-3-mockups.md`
- `.opencode/gates/gate-5-technical-plan.md`
- `.opencode/commands/gate-2-design.md`
- `.opencode/commands/gate-3-mockups.md`
- `.opencode/commands/gate-5-technical-plan.md`
- `.opencode/commands/implement-slice.md`
- `.opencode/commands/plan-slices.md`
- `.opencode/skills/create-slice/SKILL.md`
- `.opencode/tasks/slices/slice-000-template.md`
- `.opencode/design-handoff/context.md`
- `.opencode/design-handoff/README.md`

## Verification

- Manual documentation review completed.
- Repo-level tests are not available; this workspace has no application code or test runner.

## Risks

- Existing projects still need Gate 3 approval to define which deviations are allowed.

## Follow-up Tasks

- Run `/prepare-design-handoff`, Gate 2, Gate 3, and Gate 5 on the next design-backed workstream.
