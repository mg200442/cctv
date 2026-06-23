---
name: create-slice
description: Split approved work into a small implementable slice with scope, acceptance criteria, risks, and verification.
compatibility: opencode
---

# Skill: Create Slice

Create slice files under `.opencode/tasks/slices/` when a separate detail file is useful.
Always reflect each active or proposed slice in `.opencode/project-status.md` under
`Active Slices`.

Each slice must include:

- Status
- Owner
- Goal
- Scope
- Non-scope
- Dependencies
- Design handoff references, when applicable
- Target technologies and assets, when applicable
- Acceptance criteria
- Design fidelity criteria, when applicable
- Risks
- Verification plan
- Report link

Also update `.opencode/project-status.md`:

- Add or update the slice under `Active Slices`.
- Add a corresponding item to `Next Actions Queue` when the slice is ready for approval.
- Set `Blocked By` to a question ID from `.opencode/open-questions.md` when user input is required.
- Keep the dashboard summary short and link the slice file for long details.

For prepared designs:

- Create enough slices to implement the design faithfully without hiding major screens, states, responsive behavior, or component families in one broad task.
- Each slice must name the source handoff, relevant screen/state/component/breakpoint, target technologies, assets, exact-match requirements, allowed deviations, and verification method.
- Do not create a generic "polish" slice unless it has concrete fidelity acceptance criteria.
