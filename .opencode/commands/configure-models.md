---
description: Conversationally choose AI providers/models and apply per-agent model assignments after approval.
agent: orchestrator
---

Configure models for OpenCode agents.

Rules:

- Do not require command arguments.
- Ask the user which AI providers are available or desired, such as OpenAI, Anthropic/Claude, Google/Gemini, Qwen, local models, or other OpenCode-configured providers.
- Ask for the preferred optimization profile:
  - `Balanced`
  - `Low Cost`
  - `High Accuracy`
  - `Custom`
- Ask whether routine agents should use cheaper models.
- Ask whether provider restrictions should be written to config or left flexible.
- Recommend a model assignment by agent role:
  - `orchestrator`: strongest reasoning/planning model.
  - `architecture`, `security`, `database`: strongest reasoning model.
  - `frontend`, `backend`: strong coding-specialized model.
  - `api`, `infra`, `testing`: medium to strong model based on risk.
  - `ux`, `design-system`: strong visual/product reasoning model.
  - `product`: strong product/reasoning model.
  - `git-committer`, `localization`, reports/docs cleanup: lower-cost capable model.
- Model IDs must be valid for the user's configured OpenCode providers. If unsure, ask the user to provide exact model IDs or use placeholders marked `TBD`.
- Present a clear proposed mapping before editing files.
- Do not apply changes until the user explicitly approves the proposed mapping.
- Once approved, update:
  - `.opencode/opencode.project.json` global `model`.
  - Per-agent `model:` frontmatter overrides where useful.
  - `.opencode/model-profiles.md` with the chosen policy.
  - `.opencode/project-status.md` `Model Policy`.
  - A report under `.opencode/reports/YYYY-Www/`.
- If this is a new project bootstrap and model policy is missing, recommend running this command before Gate 0 proceeds.

Arguments are optional context only:

`$ARGUMENTS`
