# Gate 1 Product Template

## Outputs

- `.opencode/docs/product/prd.md`
- `.opencode/docs/product/feature-list.md`
- `.opencode/docs/product/acceptance-criteria.md`
- `.opencode/docs/product/roadmap.md`
- `.opencode/open-questions.md`
- `.opencode/project-status.md`

## Exit Criteria

- MVP scope and non-scope are explicit.
- Users, roles, workflows, and acceptance criteria are documented.
- Workstream type, priority, gate path, and next approval decision are reflected in `.opencode/project-status.md`.
- Relevant product questions are captured in `.opencode/open-questions.md`.
- Relevant technical questions that affect product scope, feasibility, acceptance criteria, sequencing, integrations, data, security, or testing are captured in `.opencode/open-questions.md`.
- Each open question includes enough context for the user to answer it directly in the file.
- `.opencode/project-status.md` shows MVP status, blockers, and the recommended next action.

## Question Discovery

During Gate 1, refine Gate 0 questions and add missing product or technical questions before
design, architecture, or implementation begins.

Consider:

- User roles, permissions, workflows, edge cases, and acceptance criteria.
- MVP versus later scope, release sequencing, and operational constraints.
- Required data, API contracts, third-party integrations, auth, privacy, compliance, and audit needs.
- Platform support, performance expectations, analytics, notifications, import/export, admin tools, and testing requirements.

Resolved questions should remain in `.opencode/open-questions.md` with their answers and
status updated, so later gates can trace decisions.
