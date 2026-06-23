# Model Profiles

This template is intentionally model-flexible.

The base config defines one global default model in `.opencode/opencode.project.json`:

```json
"model": "openai/gpt-5.5"
```

All agents inherit that global model unless you add a `model:` line to a specific agent frontmatter.
This makes it easy to test Claude, Qwen, OpenAI, local models, or any provider configured in OpenCode.

## Recommended command

Run `/configure-models` to choose providers and models conversationally.

The command should:

- Ask which providers are available or desired.
- Ask for exact model IDs when needed.
- Recommend a per-agent mapping.
- Present the mapping for approval before editing files.
- Apply approved changes to `.opencode/opencode.project.json`, agent frontmatter,
  `.opencode/project-status.md`, and this file.

For new projects, bootstrap should recommend configuring models before Gate 0 proceeds
unless the user explicitly defers model policy.

## Recommended strategy

Use the strongest model only where it matters most:

| Work type | Suggested model class | Why |
| --- | --- | --- |
| Orchestration / planning | Strong reasoning | Coordinates gates, scope, risks, and Git escalation. |
| Architecture / security / database | Strong reasoning | Mistakes are expensive and hard to reverse. |
| Backend / frontend implementation | Strong or coding-specialized | Needs code correctness and tests. |
| UX / design-system | Strong visual/product reasoning | Needs consistency, accessibility, responsive judgement. |
| Testing | Medium or strong | Good place to balance cost and coverage. |
| Git routine / localization / reports / docs cleanup | Lower-cost capable model | Usually lower risk and high volume. |

## Agent assignment guide

| Agent | Preferred model class |
| --- | --- |
| orchestrator | Strong reasoning/planning |
| product | Strong reasoning/product |
| ux | Strong product/visual reasoning |
| design-system | Strong visual/design-system reasoning |
| architecture | Strong reasoning |
| database | Strong reasoning |
| api | Strong coding/reasoning |
| security | Strong reasoning/security |
| testing | Medium or strong reasoning |
| frontend | Strong coding-specialized |
| backend | Strong coding-specialized |
| infra | Medium or strong reasoning |
| git-committer | Lower-cost capable |
| localization | Lower-cost capable |

Do not assume a model ID is available unless it is configured in the user's OpenCode
environment or provided by the user. If exact IDs are unknown, write the proposed class
and ask for the exact IDs before applying.

## Profile: balanced default

Use one solid global model and only override cheaper tasks.

```json
{
  "model": "openai/gpt-5.5"
}
```

Optional overrides:

```yaml
# .opencode/agents/localization.md
model: qwen/qwen3-coder

# .opencode/agents/git-committer.md
model: qwen/qwen3-coder

# .opencode/agents/testing.md
model: anthropic/claude-sonnet-4-5
```

## Profile: low cost

Use a cheaper default model and override only critical specialists.

```json
{
  "model": "qwen/qwen3-coder"
}
```

Optional overrides:

```yaml
# .opencode/agents/orchestrator.md
model: openai/gpt-5.5

# .opencode/agents/architecture.md
model: anthropic/claude-sonnet-4-5

# .opencode/agents/security.md
model: anthropic/claude-sonnet-4-5
```

## Profile: high accuracy

Use a strong global model and override implementation with your preferred coding model.

```json
{
  "model": "openai/gpt-5.5"
}
```

Optional overrides:

```yaml
# .opencode/agents/frontend.md
model: anthropic/claude-sonnet-4-5

# .opencode/agents/backend.md
model: anthropic/claude-sonnet-4-5
```

## How to change the global model

Edit `.opencode/opencode.project.json`, then copy it to the project root as `opencode.json`:

```sh
cp .opencode/opencode.project.json opencode.json
```

Restart OpenCode after changing config.

## How to override one agent

Add `model:` to that agent's frontmatter:

```yaml
---
description: Backend implementation specialist...
mode: subagent
model: anthropic/claude-sonnet-4-5
temperature: 0.1
---
```

Remove the `model:` line later to make the agent inherit the global model again.

## Provider policy

By default `.opencode` does not set `enabled_providers` or `disabled_providers`.
That is intentional, so projects can test different providers.

If a project must be OpenAI-only, add this to `opencode.json`:

```json
"enabled_providers": ["openai"],
"disabled_providers": ["google", "vercel"]
```

If a project should allow several providers, leave provider restrictions out and configure provider auth outside this template.

## Notes

- Model IDs must match the providers configured in your OpenCode environment.
- Keep model choices in config/agent frontmatter, not in application code.
- Prefer documenting experiments and outcomes in `.opencode/reports/`.
