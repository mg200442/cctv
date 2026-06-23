---
description: Initialize a virgin OpenCode workspace and analyze the repository context.
agent: orchestrator
---

Bootstrap the workspace before running gates, slices, or implementation.

Rules:

- Read `.opencode/project-status.md` and `.opencode/open-questions.md`.
- If `Workspace Mode` is `Uninitialized` or missing, ask the user whether this is a `New Project` or an `Existing Application`.
- Do not require command arguments. Ask concise follow-up questions conversationally when needed.
- For `New Project`, update `.opencode/project-status.md` with workspace context and create the initial broad discovery questions across product, UX, frontend, backend, API, database, security, testing, and infra/devops.
- For `New Project`, check `.opencode/project-status.md` `Model Policy`. If model policy is `Unconfigured` or missing, ask whether to run `/configure-models` before Gate 0 proceeds.
- For `Existing Application`, inspect the repository enough to detect stack, package manager, app areas, tests, build/lint/typecheck commands, CI/CD, deployment hints, and obvious risks.
- Detect Git status, current branch, default/base branch when inferable, and remotes.
- Check `.opencode/design-handoff/` for design input files beyond `README.md`, `context.md`, and `archive/`.
- Record design inbox status in `.opencode/project-status.md` under `Design Inbox`.
- If design input files exist, add or recommend `/prepare-design-handoff` as the next design action. Do not process or archive design files during bootstrap.
- If no design input files exist, record `Design Files Present: No` and do not run design handoff processing.
- Record the analysis in `.opencode/project-status.md` under `Repository Analysis`.
- If tests exist, record that new features and bugfixes should add or update relevant tests.
- If tests do not exist, record that new features and bugfixes must either add a minimal test harness/test or explicitly document why tests are not applicable.
- Add any blocking unknowns to `.opencode/open-questions.md` with blank `User Answer` areas.
- Add the first appropriate workstream and next action to `.opencode/project-status.md`.
- Create a report under `.opencode/reports/YYYY-Www/`.

Arguments are optional. If present, treat them as context only:

`$ARGUMENTS`
