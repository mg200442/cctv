---
name: bootstrap-workspace
description: Initialize a virgin OpenCode workspace, determine new/existing mode, and analyze repository readiness.
compatibility: opencode
---

# Skill: Bootstrap Workspace

Use before gates, slices, or implementation when `.opencode/project-status.md` has
`Workspace Mode: Uninitialized` or no workspace mode.

Workflow:

1. Ask whether the workspace is a `New Project` or an `Existing Application`.
2. Update `.opencode/project-status.md` `Workspace Context`.
3. For a new project, check `Model Policy`; if unconfigured, recommend `/configure-models` before Gate 0 proceeds.
4. For a new project, create a broad discovery question battery in `.opencode/open-questions.md`.
5. For an existing application, inspect repository structure and record `Repository Analysis`.
6. Detect tests and record the testing expectation for future features and bugfixes.
7. Check `.opencode/design-handoff/` for design input files, ignoring `README.md`, `context.md`, and `archive/`.
8. Record design inbox status in `.opencode/project-status.md`.
9. If design input files exist, recommend or add `/prepare-design-handoff` as the next design action. Do not process design files during bootstrap.
10. Create or update the bootstrap workstream.
11. Add the next action to `.opencode/project-status.md`.
12. Create a report under `.opencode/reports/YYYY-Www/`.

Existing application analysis should look for:

- Stack and frameworks.
- Package manager.
- Frontend/backend/API/database areas.
- Test files and test scripts.
- Build, lint, typecheck scripts.
- CI/CD config.
- Docker/deployment files.
- README or local setup notes.
- Git current branch, likely base branch, and remotes.

Design inbox analysis should look for:

- Any files or folders in `.opencode/design-handoff/` other than `README.md`, `context.md`, and `archive/`.
- Whether `context.md` contains useful non-template content.
- Whether `/prepare-design-handoff` should be recommended next.

Do not run destructive commands. Prefer read-only inspection.
