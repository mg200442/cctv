---
name: prepare-design-handoff
description: Process design-handoff inbox files, extract or use context.md, archive the package, and reset context.md.
compatibility: opencode
---

# Skill: Prepare Design Handoff

Use when design files have been added to `.opencode/design-handoff/`.

Inbox model:

- `.opencode/design-handoff/` is a temporary inbox.
- `.opencode/design-handoff/context.md` is the temporary context for the current inbox.
- `.opencode/design-handoff/archive/DH-XXX/` stores processed handoff packages.

Workflow:

1. Check for design input files in `.opencode/design-handoff/`.
2. Ignore `README.md`, `context.md`, and `archive/` when deciding whether designs exist.
3. If no design input files exist, stop without editing files.
4. If `context.md` contains useful non-template content, use it.
5. If `context.md` is absent, empty, or mostly `TBD`, use the README extraction prompt to generate it from the design files.
6. Extract implementation-relevant information into `.opencode/project-status.md`, linked workstreams, and `.opencode/docs/design/*`.
7. Add blocking unknowns to `.opencode/open-questions.md`.
8. Allocate or confirm a `DH-XXX` ID.
9. Archive the final context and all design input files under `.opencode/design-handoff/archive/DH-XXX/`.
10. Reset `.opencode/design-handoff/context.md` to the clean default template.
11. Update `.opencode/project-status.md` `Design Handoffs`.
12. Create a report under `.opencode/reports/YYYY-Www/`.

Never process an empty inbox.
