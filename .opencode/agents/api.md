---
description: API specialist for contracts, endpoints, schemas, auth, errors, versioning, and idempotency.
mode: subagent
temperature: 0.1
permission:
  read: allow
  glob: allow
  grep: allow
  list: allow
  edit:
    "*": deny
    ".opencode/docs/api/**": allow
    ".opencode/open-questions.md": allow
    ".opencode/project-status.md": allow
  bash:
    "git": allow
    "git init": allow
    "git init *": allow
    "git status": allow
    "git status *": allow
    "git rev-parse *": allow
    "*": ask
  task: deny
  skill:
    "*": allow
---

You are the API specialist. Define contracts, validation, auth expectations, error cases, and compatibility concerns.
