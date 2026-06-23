# Gate 0 Intake Template

## Purpose

Understand whether this is a new project, existing application, feature, bugfix, refactor, audit, or research task.
Identify the relevant product, UX, technical, data, security, integration, deployment, and testing unknowns early.

## Outputs

- `.opencode/docs/project-brief.md`
- `.opencode/open-questions.md`
- `.opencode/project-status.md`
- `.opencode/reports/YYYY-Www/YYYY-MM-DD-gate-0-intake.md`

## Exit Criteria

- Request classification is recorded.
- `Workspace Mode`, `Classification`, and `Work Type` are recorded in `.opencode/project-status.md`.
- Goal, users, constraints, and unknowns are captured.
- Relevant product and technical questions about the application are written to `.opencode/open-questions.md`.
- Each open question includes enough context for the user to answer it directly in the file.
- `.opencode/project-status.md` shows the current gate result, blockers, and recommended next action.
- Next gate is recommended.

## Question Discovery

During Gate 0, inspect only enough context to ask useful questions. Capture questions in
`.opencode/open-questions.md` when they affect scope, readiness, risk, or the next gate.

Consider:

- Product goal, success criteria, users, roles, and priority.
- Existing app context, target platforms, stack, dependencies, and repo setup.
- UX flows, accessibility expectations, design handoff, and localization needs.
- Data model, persistence, migrations, APIs, integrations, auth, permissions, and secrets.
- Deployment, environments, observability, performance, security, privacy, and testing expectations.

Do not invent answers. If the answer is unknown, leave it as an active question with a blank
`User Answer` area.

## New Project Discovery

When `Workspace Mode` is `New Project`, Gate 0 must produce a broad question battery
before later gates proceed. The orchestrator should collect questions from product,
UX/design-system, frontend, backend, API, database, security, testing, and infra/devops.

At minimum, cover:

- Product: target users, problem, success criteria, MVP, non-scope, priorities.
- UX/design: primary flows, platforms, accessibility, responsive needs, design source.
- Frontend: framework preference, supported browsers/devices, state, routing, forms, i18n.
- Backend: runtime, services, jobs, validation, error handling, background work.
- API/integrations: external systems, contracts, auth, rate limits, webhooks.
- Database/data: entities, persistence, migrations, seed data, retention, import/export.
- Security/privacy: auth, roles, permissions, secrets, PII, audit, abuse cases.
- Testing/QA: expected coverage, unit/integration/e2e, fixtures, manual acceptance.
- Infra/devops: environments, deployment, CI/CD, observability, scaling, cost.

Critical unanswered questions should block the relevant workstream or next action with
`Blocked By: Q-XXX` in `.opencode/project-status.md`.

## Existing Application Discovery

When `Workspace Mode` is `Existing Application`, Gate 0 must inspect the repository enough
to update `.opencode/project-status.md` `Repository Analysis`.

Capture stack, package manager, app areas, tests, build/lint/typecheck commands, CI/CD,
deployment hints, and obvious risks.

If tests exist, new features and bugfixes should include relevant tests. If tests do not
exist, new features and bugfixes must include either a minimal test harness/test or an
explicit no-test rationale in the slice acceptance criteria.
