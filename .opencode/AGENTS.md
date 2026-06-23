# OpenCode Agent Operating System

## Purpose

This project uses OpenCode through an isolated workspace at `.opencode/`.
All OpenCode-owned artifacts should stay inside `.opencode/` unless the user explicitly asks
to create or edit application files.

## Entry Point

- The user talks to `@orchestrator` first.
- The orchestrator coordinates specialist subagents.
- Specialists never ask the user directly; they write questions to `.opencode/open-questions.md`.
- The user-facing operational dashboard is `.opencode/project-status.md`.

## Workflow

1. Gate 0 Intake
2. Gate 1 Product
3. Gate 2 Design needs
4. Gate 3 Mockups or design approval
5. Gate 4 Architecture
6. Gate 5 Technical plan and slices
7. Gate 6 Implementation
8. Gate 7 Review and handoff

## Global Rules

- Start by classifying the request: new project, existing application, feature, bugfix, refactor, audit, research, or OpenCode customization.
- If `.opencode/project-status.md` has `Workspace Mode: Uninitialized` or no workspace mode, run workspace bootstrap before gates, slices, or implementation.
- For new projects, ensure `.opencode/project-status.md` `Model Policy` is configured or explicitly deferred before Gate 0 proceeds.
- Use `/configure-models` to ask which AI providers/models are available, recommend per-agent assignments, and apply them after approval.
- New work arrives as workstreams. Use `/add-task` to add features, bugs, refactors, audits, DevOps/security/design tasks, research, or OpenCode customization work conversationally.
- Each non-trivial workstream should record its Git branch strategy in `.opencode/project-status.md`.
- Use `/prepare-workstream-branch` when a workstream should get a dedicated branch or upstream push.
- Keep only one gate active at a time.
- No implementation starts until the active gate exit criteria are met and the slice is approved.
- Split large work into small vertical slices.
- Every completed gate, slice, audit, or review needs a report under `.opencode/reports/`.
- Record major decisions as ADRs under `.opencode/docs/decisions/`.
- Agents must update `.opencode/project-status.md` whenever gate state, next actions, slice status, blockers, approvals, completed work, or recommended next steps change.
- `.opencode/project-status.md` is the single user-facing place to see current status and next steps. Other planning files are supporting detail, not the dashboard.
- Every unresolved question written to `.opencode/open-questions.md` must use the question block template with a blank fenced `User Answer` area.
- Any agent may run the minimum Git bootstrap commands needed to detect or initialize a missing repository: `git`, `git rev-parse *`, `git status *`, and `git init *`.
- Routine Git lifecycle work is delegated to `git-committer`: status/diff review, staging, commits, safe branch movement, pushes, fast-forward merges, clean rebases, and non-destructive resets.
- `git-committer` must escalate to the orchestrator for conflicts, destructive operations, force pushes, non-fast-forward merges, hard resets, branch/tag/release decisions, ambiguous ownership, or anything requiring code/domain judgment.
- Auto-advance must read `.opencode/project-status.md` and `.opencode/open-questions.md` before doing anything.
- Auto-advance may run up to `Max Items Per Run` queue items marked `Approved` by ascending `Order` when automation settings allow execution. Each item must finish its report and Git handoff before the next item starts.
- If `.opencode/design-handoff/` contains external designs, use `.opencode/design-handoff/context.md` as the design starting point for Gate 2 and Gate 3 before architecture or implementation.
- Use `/prepare-design-handoff` to process the design-handoff inbox. It must stop without changes if no design input files exist.
- When a design is already prepared, treat the approved handoff as an implementation contract. Study all supplied screens, states, assets, prototypes, HTML/CSS, technology notes, and responsive variants before architecture, slicing, or implementation.
- External design handoff files are references, not production-ready implementation by default; adapt them to the approved target stack after approval. If the handoff names specific technologies, frameworks, components, exported code, asset formats, or design-system constraints, Gate 4 and Gate 5 must explicitly map the implementation to those technologies or document a pre-approved deviation.
- Implement approved prepared designs with high visual and behavioral fidelity. Any deviation from layout, spacing, typography, colors, assets, interactions, content, responsive behavior, or technology choices must be recorded in Gate 3 or the slice before implementation begins.
- Model selection should stay flexible: agents inherit the global model unless an explicit per-agent `model:` override is added. Use `.opencode/model-profiles.md` when choosing cost/quality profiles.

## Definition of Ready

- Problem and goal are clear.
- Scope and non-scope are explicit.
- Acceptance criteria are written.
- For prepared designs, exact-match requirements, allowed deviations, target technologies, assets, responsive rules, and required states are documented.
- UX, accessibility, security, data, API, and test impacts are known or marked not applicable.
- The slice is small enough to complete and review independently.

## Definition of Done

- Acceptance criteria are met.
- Prepared design fidelity is verified against the approved handoff, including required technologies or documented approved deviations.
- Verification is recorded.
- Security and accessibility risks are reviewed when relevant.
- Documentation is updated.
- A report exists under `.opencode/reports/`.
