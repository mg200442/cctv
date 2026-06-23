---
name: add-task
description: Conversationally add a feature, bugfix, refactor, audit, DevOps, security, design, research, or OpenCode customization workstream.
compatibility: opencode
---

# Skill: Add Task

Use when the user wants to add work without memorizing fields or command arguments.

Workflow:

1. Accept any free-form input: pasted ticket, Asana/Jira/GitHub text, link, or short summary.
2. Ask concise follow-up questions for missing required context.
3. Classify the workstream type.
4. Create or update the workstream in `.opencode/project-status.md`.
5. Ask for Git branch preference: new branch and push upstream, new local branch, current branch, or decide later.
6. Choose a recommended adaptive gate path.
7. Add the next action to `.opencode/project-status.md`.
8. If information is missing, create questions in `.opencode/open-questions.md` and mark the workstream or action `Blocked By: Q-XXX`.
9. Mark ready next actions as `Needs Approval`, never `Approved`.
10. Create a report under `.opencode/reports/YYYY-Www/`.

Required context:

- Title or short summary.
- Type when inferable, otherwise ask.
- User/system behavior to change.
- Priority or urgency.
- Done criteria or expected outcome.
- Branch preference.
- Existing design files or archived design handoff, if any.

Bugfix extras:

- Reproduction steps.
- Expected behavior.
- Actual behavior.
- Environment.
- Logs/screenshots when available.
- Frequency and severity.

Feature extras:

- Target user.
- Workflow.
- Scope and non-scope.
- UX/design impact.
- API/data/security/testing impact.

Testing rule:

- If repository analysis says tests exist, include expected test updates.
- If tests are absent, require a minimal test harness/test or an explicit no-test rationale.

Branch naming:

- Feature: `feature/ws-XXX-short-title`
- Bugfix: `bugfix/ws-XXX-short-title`
- Refactor: `refactor/ws-XXX-short-title`
- DevOps: `devops/ws-XXX-short-title`
- Security: `security/ws-XXX-short-title`
- Design: `design/ws-XXX-short-title`
- OpenCode Customization: `chore/opencode-XXX`
