---
name: configure-models
description: Ask the user which AI providers/models to use, recommend per-agent assignments, and apply them after approval.
compatibility: opencode
---

# Skill: Configure Models

Use when the user wants OpenCode to choose or update provider/model assignments.

Workflow:

1. Ask which providers are available or desired.
2. Ask for exact model IDs when needed.
3. Ask for profile: `Balanced`, `Low Cost`, `High Accuracy`, or `Custom`.
4. Recommend agent assignments by role and risk.
5. Explain tradeoffs briefly.
6. Ask for explicit approval before editing.
7. On approval, update `.opencode/opencode.project.json`, relevant agent frontmatter,
   `.opencode/model-profiles.md`, and `.opencode/project-status.md`.
8. Create a report under `.opencode/reports/YYYY-Www/`.

Recommended model classes:

- Strong reasoning: orchestrator, architecture, security, database.
- Strong coding: frontend, backend, API when implementation-heavy.
- Medium/strong: testing, infra.
- Strong visual/product: UX, design-system, product.
- Lower-cost capable: git-committer, localization, reporting, docs cleanup.

Safety:

- Do not invent exact model IDs as if guaranteed available.
- Use model IDs provided by the user or already documented in the workspace.
- If the user asks for latest model recommendations, verify current provider docs before
  finalizing exact IDs.
- Keep provider restrictions optional unless the user requests them.
