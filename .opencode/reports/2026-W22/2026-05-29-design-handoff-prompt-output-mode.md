# Design Handoff Prompt Output Mode Update

Date: 2026-05-29
Type: OpenCode customization

## Summary

Updated the design handoff extraction prompt so it works both inside OpenCode and in
external tools.

## Changes

- Clarified that inside OpenCode the result should be written directly to
  `.opencode/design-handoff/context.md`.
- Clarified that outside OpenCode the prompt should return one complete markdown
  document ready to paste wholesale into `context.md`.
- Added instructions to avoid extra commentary and to fill all sections automatically,
  using `TBD` plus open questions when information is missing.

## Verification

- Reviewed `.opencode/design-handoff/README.md` prompt wording.
