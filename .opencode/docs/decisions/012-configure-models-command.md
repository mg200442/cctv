# ADR 012: Conversational Model Configuration

Date: 2026-05-29

## Status

Accepted

## Context

OpenCode can use multiple AI providers and model versions. The workspace needs a way
to ask the user which providers/models are available and assign suitable models to
subagents without requiring manual frontmatter edits.

## Decision

Add `/configure-models` and the `configure-models` skill.

The command asks which providers and model IDs are available, recommends per-agent
assignments by role and risk, presents the mapping for approval, and only then edits
config and agent frontmatter.

For new projects, bootstrap must ensure model policy is configured or explicitly
deferred before Gate 0 proceeds.

## Consequences

- The user can choose OpenAI, Anthropic/Claude, Google/Gemini, Qwen, local, or other
  configured providers conversationally.
- Strong models can be reserved for high-risk agents.
- Lower-cost models can be used for routine work.
- Exact model IDs are not invented; the workflow asks for IDs or uses already
  documented ones.
