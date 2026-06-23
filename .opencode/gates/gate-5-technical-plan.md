# Gate 5 Technical Plan Template

## Outputs

- `.opencode/tasks/implementation-plan.md`
- `.opencode/tasks/slices/*.md`
- `.opencode/project-status.md`

## Exit Criteria

- Work is split into small slices.
- Each slice has scope, non-scope, acceptance criteria, risks, owner, and verification.
- Prepared designs are split into enough vertical slices to preserve fidelity without bundling unrelated screens, states, or components.
- Each design-related slice names the approved handoff reference, target technologies, assets, exact-match requirements, allowed deviations, and design verification steps.
- Slices are reflected in `.opencode/project-status.md` under `Active Slices`.
- At least one next action is listed in `.opencode/project-status.md` with enough detail for the user to approve or reject it.

## Prepared Design Slice Planning

- Prefer more small slices over broad implementation batches when a prepared design has multiple screens, responsive breakpoints, complex states, animations, or technology constraints.
- Plan slices around vertical user-visible outcomes: one screen, flow segment, component family, responsive behavior set, or state cluster at a time.
- Do not merge design fidelity cleanup into a vague final polish slice. Capture concrete fidelity checks in the slice acceptance criteria and verification plan.
- If the handoff specifies technologies, frameworks, component libraries, exported code, or asset formats, map them to implementation files and verification steps in the slice.
