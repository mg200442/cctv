---
description: Process the design-handoff inbox, extract context, archive the package, and reset context.md.
agent: orchestrator
---

Process a design handoff inbox.

Rules:

- Read `.opencode/design-handoff/README.md`, `.opencode/design-handoff/context.md`, `.opencode/project-status.md`, and `.opencode/open-questions.md`.
- First verify that `.opencode/design-handoff/` contains design input files beyond `README.md`, `context.md`, and `archive/`.
- If no design input files exist, stop. Do not modify `context.md`, `project-status.md`, `open-questions.md`, archive, or reports except for a brief response saying there are no designs to process.
- Design input files may be screenshots, exports, Figma notes, HTML/CSS prototypes, videos, images, brand assets, markdown links, or any user-provided design package.
- If `context.md` has useful non-template content, use it as the source of truth.
- If `context.md` is missing, empty, or mostly `TBD`, use the extraction prompt in `.opencode/design-handoff/README.md` to create it from the design files and user context.
- Extract and reflect all implementation-relevant information in `.opencode/project-status.md`, linked workstreams, `.opencode/docs/design/*`, and `.opencode/open-questions.md` as appropriate.
- If missing information blocks design, architecture, slicing, or implementation, add questions to `.opencode/open-questions.md` with blank `User Answer` areas and mark the relevant workstream/action `Blocked By: Q-XXX`.
- Allocate or confirm a `DH-XXX` handoff ID.
- Archive the processed package under `.opencode/design-handoff/archive/DH-XXX/`, including the final `context.md` and all design input files.
- After archiving, reset `.opencode/design-handoff/context.md` to the default clean template for the next design package.
- Leave `.opencode/design-handoff/README.md` and `.opencode/design-handoff/archive/` in place.
- Update `.opencode/project-status.md` `Design Handoffs`.
- Create a report under `.opencode/reports/YYYY-Www/`.

Arguments are optional context only:

`$ARGUMENTS`
