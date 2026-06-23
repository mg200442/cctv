# OpenCode Workspace Instructions

## Repository Shape

- This repo currently contains only the portable OpenCode workspace in `.opencode/`; there is no application code, package manifest, CI config, or test runner yet.
- Keep OpenCode-owned plans, gates, questions, decisions, reports, reviews, slices, and generated workflow docs under `.opencode/` unless the user explicitly asks for application files.
- `.opencode/opencode.json` is the active project config and loads `.opencode/AGENTS.md`, `.opencode/skills`, and `@orchestrator` as the default agent.

## Operating Flow

- Start by classifying the request as new project, existing application, feature, bugfix, refactor, audit, research, or OpenCode customization.
- Route normal work through `@orchestrator`; specialist agents should not ask the user directly and must write unresolved questions to `.opencode/docs/open-questions.md`.
- Keep one gate active at a time: Gate 0 Intake, Gate 1 Product, Gate 2 Design needs, Gate 3 Mockups/design approval, Gate 4 Architecture, Gate 5 Technical plan/slices, Gate 6 Implementation, Gate 7 Review/handoff.
- Do not implement until the active gate exit criteria are met and the relevant slice is approved.
- Split implementation into small vertical slices under `.opencode/tasks/slices/`; each slice needs scope, non-scope, acceptance criteria, risks, verification plan, and report link.
- Every completed gate, slice, audit, or review needs a report under `.opencode/reports/`; major decisions go under `.opencode/docs/decisions/` as ADRs.

## Commands And Automation

- Start OpenCode from the repo root with `opencode` so `.opencode/opencode.json` is found.
- Use slash commands in `.opencode/commands/` for workflow steps, especially `/gate-0-intake` through `/gate-7-review`, `/plan-slices`, `/implement-slice`, `/review-slice`, `/report`, and `/auto-advance`.
- `/auto-advance` must read `.opencode/tasks/approved_next_slice.md`, `.opencode/docs/open-questions.md`, and `.opencode/tasks/backlog.md` before doing anything.
- Auto-advance runs only when `Enabled: Yes`, `Mode: Execute Approved`, and `Max Items Per Run: 1`; it may execute only the first `Approved` queue item by ascending `Order`.
- Before approved implementation or auto-advance work, use the `manage-git` skill to inspect status/diffs and create the required fallback commit or empty rollback marker.

## Design And Implementation Inputs

- If `.opencode/design-handoff/` contains HTML/CSS, screenshots, or assets, treat it as the Gate 2 and Gate 3 design starting point before architecture or implementation.
- Design handoff files are references, not production-ready implementation; adapt them to the chosen target stack after approval.
- Current design handoff examples exist for `web`, `tablet`, and `mobile`, but no production stack has been selected in repo files.

## Skills And Ownership

- Use repo-local skills from `.opencode/skills`; notable skills cover PR/security/accessibility review, Git management, slices, reports, PRDs, RFCs, ADRs, API contracts, endpoints, DB migrations, feature specs, and visual mockups.
- Git operations are owned by the orchestrator through `manage-git`; do not discard user changes, force-push, rebase, merge, tag, or change branches unless explicitly requested.
- Agents inherit the global model `openai/gpt-5.5` unless their frontmatter sets `model:`; use `.opencode/model-profiles.md` before changing model strategy.

## Verification

- There is no repo-level build, lint, typecheck, or test command yet; record verification as not available until application tooling exists.
- Definition of done for workflow items: acceptance criteria met, verification recorded, relevant security/accessibility risks reviewed, docs updated, and report linked under `.opencode/reports/`.
