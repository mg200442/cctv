# Project Status

This is the single operational dashboard for the project. Start here to see where
the work stands, what is blocked, and what can be approved next.

Answer blocking or clarification questions in `.opencode/open-questions.md`.

## Automation Settings

| Setting | Value | Notes |
| --- | --- | --- |
| Enabled | No | Set to `Yes` only when explicit auto-advance is desired. |
| Check Every | Manual | Auto-advance is launched manually. |
| Mode | Report Only | Use `Execute Approved` only after setup is confirmed. |
| Max Items Per Run | 1 | Maximum number of approved items to run per invocation. If set to `2`, run the first approved item, finish its report and Git handoff, then run the second approved item. |
| Require Fallback Commit | Yes | Create rollback marker before starting approved work. |
| Default Approved By | Project Owner | Used when approved item has empty or `TBD` approver. |
| Last Checked At | TBD | Updated by automation. |
| Last Run Result | TBD | Examples: Disabled, No Approved Item, Blocked, Started, Completed. |

## Workspace Context

- Workspace Mode: Uninitialized
- Product Name: TBD
- Repository Status: Unknown
- Current Focus: Bootstrap workspace
- Default Gate Policy: Adaptive by workstream
- Last Analysis: TBD

## Repository Analysis

- Detected Stack: TBD
- Package Manager: TBD
- App Areas: TBD
- Test Status: Unknown
- Test Command: TBD
- Build Command: TBD
- Lint Command: TBD
- Typecheck Command: TBD
- CI/CD: TBD
- Deployment: TBD
- Default Base Branch: TBD
- Remote: TBD
- Notes:
  - Run `/bootstrap-workspace` before gates, slices, or implementation.

## Design Inbox

- Design Files Present: Unknown
- Context Present: Unknown
- Last Checked: TBD
- Recommended Action: Run `/bootstrap-workspace` first.
- Notes:
  - Bootstrap checks whether `.opencode/design-handoff/` contains design input files.
  - `/prepare-design-handoff` processes designs only when input files exist.

## Model Policy

- Status: Unconfigured
- Profile: TBD
- Providers Included: TBD
- Global Model: `.opencode/opencode.project.json`
- Provider Restrictions: Flexible
- Last Configured: TBD
- Recommended Action: Run `/configure-models`.

| Agent | Model | Reason |
| --- | --- | --- |
| orchestrator | Inherit global | TBD |
| product | Inherit global | TBD |
| ux | Inherit global | TBD |
| design-system | Inherit global | TBD |
| architecture | Inherit global | TBD |
| database | Inherit global | TBD |
| api | Inherit global | TBD |
| security | Inherit global | TBD |
| testing | Inherit global | TBD |
| frontend | Inherit global | TBD |
| backend | Inherit global | TBD |
| infra | Inherit global | TBD |
| git-committer | Inherit global | TBD |
| localization | Inherit global | TBD |

## Current State

- Classification: Uninitialized
- Work Type: Bootstrap
- Active Gate: Gate 0 Intake
- Current Objective: Establish project context and readiness.
- Last Completed: None
- Current Blocker: None
- Updated At: TBD
- Updated By: TBD

## Decision Needed From User

- Decision: Approve the next action when ready.
- Why It Matters: Auto-advance only runs items explicitly approved in this dashboard.
- Options: Keep as `Proposed`, answer blocking questions, or change the item status to `Approved`.
- Recommended Option: Review the first proposed action in `Next Actions Queue`.
- How To Approve: Change the item's `Status` to `Approved`, set `Approved By`, and set `Approved At`.

## Next Actions Queue

| Order | Type | ID | Command | Target | Status | Approved By | Approved At | Finished At | Blocked By | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Gate | gate-0-intake | `/gate-0-intake` | `.opencode/gates/gate-0-intake.md` | Proposed | TBD | TBD | TBD | None | Start intake and capture initial product/technical questions. |

Status values: `Proposed`, `Needs Approval`, `Approved`, `In Progress`, `Blocked`,
`Completed`, `Skipped`, `Consumed`.

## Workstreams

| ID | Type | Source | Title | Status | Priority | Branch | Active Gate | Gate Path | Blocked By | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WS-001 | Bootstrap | OpenCode | Initialize workspace | Proposed | High | TBD | Bootstrap | Bootstrap -> Gate 0 | None | Run `/bootstrap-workspace`. |

Workstream types: `Feature`, `Bugfix`, `Refactor`, `Audit`, `DevOps`, `Security`,
`Design`, `Research`, `OpenCode Customization`, `Bootstrap`.

## Git Branch Policy

- Default Strategy: Ask per workstream
- Branch Naming:
  - Feature: `feature/ws-XXX-short-title`
  - Bugfix: `bugfix/ws-XXX-short-title`
  - Refactor: `refactor/ws-XXX-short-title`
  - DevOps: `devops/ws-XXX-short-title`
  - Security: `security/ws-XXX-short-title`
  - Design: `design/ws-XXX-short-title`
  - OpenCode Customization: `chore/opencode-XXX`
- Push Policy: Push after each completed slice when the workstream branch has an upstream.
- PR Expected: Ask per workstream.

### Workstream Branch Template

- Workstream: WS-XXX
- Branch Strategy: New Branch + Push Upstream | New Local Branch | Current Branch | No Git | Decide Later
- Branch Name: TBD
- Base Branch: TBD
- Remote: origin
- Upstream: TBD
- PR Expected: Yes | No | TBD
- Push Policy: After each completed slice | End of workstream | Manual only | No push

## Design Handoffs

| ID | Workstream | Status | Inbox Context | Archived Package | Source | Analyzed At | Approved At | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DH-001 | TBD | Draft | `.opencode/design-handoff/context.md` | TBD | TBD | TBD | TBD | Awaiting design input files. |

Design handoff statuses: `Draft`, `Analyzed`, `Approved`, `Superseded`, `Archived`.

Rules:

- `.opencode/design-handoff/` is a temporary inbox.
- Do not process the inbox unless it contains design files beyond `README.md`, `context.md`, and `archive/`.
- Archive processed handoff packages under `.opencode/design-handoff/archive/DH-XXX/`.
- Reset `.opencode/design-handoff/context.md` to a clean template after archiving.
- If a new design belongs to another workstream, create a new `DH-XXX` entry.
- If a design replaces an older one, mark the older handoff `Superseded`.
- Prepared approved designs are implementation contracts for visual fidelity, behavior, assets, responsive rules, required states, and stated technologies.
- Any deviation from an approved prepared design must be recorded before implementation.

## Active Slices

No active slices yet.

When work is complex, add slices here. Keep each slice small enough to implement and
review independently.

### Slice Template

- ID: slice-XXX-short-name
- Status: Proposed | Needs Approval | Approved | In Progress | Blocked | Completed | Skipped
- Gate: TBD
- Goal: TBD
- Scope: TBD
- Non-Scope: TBD
- Design Handoff References: TBD
- Target Technologies/Assets: TBD
- Acceptance Criteria:
  - TBD
- Design Fidelity Criteria:
  - Exact-match requirements: TBD
  - Approved deviations: TBD
  - Responsive/state coverage: TBD
- Files/Areas: TBD
- Verification: TBD
- Design Comparison: TBD
- Blocked By: None
- Approval: TBD
- Report: TBD

## Completed Work

| Date | Type | ID | Result | Report |
| --- | --- | --- | --- | --- |
| 2026-06-05 | OpenCode Customization | prepared-design-fidelity-rules | Completed | `.opencode/reports/2026-W23/2026-06-05-prepared-design-fidelity-rules.md` |
| TBD | TBD | TBD | TBD | TBD |

## Change Log

- 2026-06-05: Strengthened prepared-design fidelity, technology mapping, and multi-slice planning rules.
- 2026-05-27: Created project dashboard as the single operational status file.
