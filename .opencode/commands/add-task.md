---
description: Add a feature, bugfix, refactor, audit, DevOps, security, design, or OpenCode customization workstream conversationally.
agent: orchestrator
---

Add a task without requiring the user to memorize arguments or field names.

Rules:

- Do not require command arguments. If the user runs `/add-task` with no details, ask concise questions conversationally.
- Ask only for missing information needed to create a useful workstream.
- Accept pasted Asana/Jira/GitHub tickets, free-form notes, screenshots described by the user, or short summaries.
- Classify the task as one of: `Feature`, `Bugfix`, `Refactor`, `Audit`, `DevOps`, `Security`, `Design`, `Research`, or `OpenCode Customization`.
- Create or update a workstream in `.opencode/project-status.md`.
- Ask whether this workstream should use a new Git branch, the current branch, or decide later. Do not require the user to know branch naming.
- Choose a recommended gate path based on task type and risk.
- Add a next action to `.opencode/project-status.md` `Next Actions Queue`.
- If required information is missing, add questions to `.opencode/open-questions.md` with blank `User Answer` areas and mark the workstream or next action `Blocked` with `Blocked By: Q-XXX`.
- If the task is ready for user decision, mark the next action `Needs Approval`, not `Approved`.
- For existing applications, consult `Repository Analysis` in `.opencode/project-status.md`. If tests are present, include expected test updates in acceptance criteria. If no tests are present, include a test-harness or no-test rationale requirement.
- If the task has an existing design, ask whether design files have already been added to `.opencode/design-handoff/` and whether `/prepare-design-handoff` should be run first.
- Keep the dashboard concise; link or create supporting slice files only when the task is complex.
- Create a report under `.opencode/reports/YYYY-Www/`.

Suggested conversational questions:

- What is the title or ticket summary?
- Is this a feature, bug, refactor, DevOps/security/design task, audit, research, or OpenCode customization?
- What user or system behavior should change?
- What is the priority or urgency?
- Is there a source link or ticket ID?
- What is in scope and out of scope?
- What would prove it is done?
- Are there known affected areas, files, routes, APIs, or environments?
- For bugs: what are the reproduction steps, expected behavior, actual behavior, frequency, environment, and logs/screenshots?
- For features: who is the user, what workflow changes, and are design/API/data/security/testing impacts expected?
- Git branch preference: create and push a new branch, create a local branch only, use the current branch, or decide later?

Arguments are optional context only:

`$ARGUMENTS`
