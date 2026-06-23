# Design Handoff

Use this folder as a temporary inbox for external designs prepared before OpenCode
starts design or implementation work.

Drop the current design package here in whatever form is convenient: screenshots,
exports, Figma notes, HTML/CSS prototypes, videos, images, brand assets, markdown
links, or other design files. There is no required folder structure for incoming
designs.

Important files and folders:

- `.opencode/design-handoff/context.md`: temporary context for the current inbox.
- `.opencode/design-handoff/archive/`: processed design handoff packages.

OpenCode treats incoming design files as reference material, not production code
unless the handoff explicitly says otherwise and Gate 3 approves that use.
Implementation must adapt design intent to the real app stack, components,
accessibility rules, state management, tests, and project constraints while
preserving the approved visual and behavioral contract.

## Inbox Rule

`/prepare-design-handoff` must first verify that this folder contains design input
files beyond `README.md`, `context.md`, and `archive/`.

If there are no design input files, it must stop without modifying anything.

## Context Rule

When processing the inbox:

- If `context.md` already contains useful non-template content, use it as the source
  of truth.
- If `context.md` is missing, empty, or mostly `TBD`, generate it from the design files
  using the extraction prompt below.
- After processing, archive the final context and design files under
  `.opencode/design-handoff/archive/DH-XXX/`.
- After archiving, reset `context.md` to a clean template for the next design package.

## Required Context

The context must cover:

- What app this is.
- Design objective.
- Included screens.
- Main user flows.
- Expected functionality.
- Required states: loading, empty, error, disabled, success.
- Responsive rules.
- Expected components.
- Interactions and behavior.
- Data and API needs.
- Accessibility requirements.
- What must be respected exactly.
- What may be adapted.
- Required or preferred technologies, frameworks, component libraries, exported code,
  asset handling, and production constraints.
- Open questions.

If context is missing or ambiguous, agents must write questions to
`.opencode/open-questions.md` and mark the relevant workstream/action as blocked in
`.opencode/project-status.md`.

## Recommended Workflow

1. Prepare the external design package outside OpenCode.
2. Place all useful design files in `.opencode/design-handoff/`.
3. Optionally paste externally generated context into `.opencode/design-handoff/context.md`.
4. Run `/prepare-design-handoff`.
5. OpenCode extracts/references the design information where needed.
6. OpenCode archives the package under `.opencode/design-handoff/archive/DH-XXX/`.
7. OpenCode resets `context.md` for the next design.
8. Run Gate 2 to review UX, accessibility, responsive behavior, and missing states.
9. Run Gate 3 to approve visual expectations and allowed deviations.
10. Run Gate 5 to split implementation into slices.

## Archive

Processed handoffs are stored as:

```text
.opencode/design-handoff/archive/DH-XXX/
├── context.md
└── [processed design files]
```

Track archived handoffs in `.opencode/project-status.md` under `Design Handoffs`.

## Extraction Prompt

Use this prompt either inside OpenCode or with an external design tool/model before
starting implementation.

- Inside OpenCode: the agent should write the result directly to
  `.opencode/design-handoff/context.md` before archiving the processed package.
- Outside OpenCode: the model/tool should return one complete markdown document that
  you can paste wholesale into `.opencode/design-handoff/context.md`, without manually
  filling sections one by one.

```text
You are preparing a design handoff for an OpenCode-driven software build.

Analyze the provided designs, screenshots, prototypes, exported HTML/CSS, notes, and
assets. Produce a concise but complete `context.md` for developers and AI agents.

Output mode:
- If you are running inside OpenCode, write the final result directly to `.opencode/design-handoff/context.md`.
- If you are running outside OpenCode, output one complete markdown document only. It must be ready to copy and paste directly into `.opencode/design-handoff/context.md`.
- Do not output commentary before or after the markdown document.
- Do not ask the user to fill sections manually. Fill every section as completely as possible from the provided material.
- If information is unknown, write `TBD` in the relevant section and add a matching item under `Open Questions`.

The output must be aligned with this workflow:
- The design files are reference material, not production-ready code unless explicitly stated.
- OpenCode will use the context during Gate 2 Design, Gate 3 Mockups/Approval, Gate 4 Architecture when needed, Gate 5 slicing, and Gate 6 implementation.
- Missing critical information should be listed as open questions.
- Implementation must adapt the design to the target stack, accessibility rules, tests, and existing project conventions.
- If the design names specific technologies, frameworks, component libraries, exported code, or asset formats, capture them clearly so architecture and slices can implement with those inputs or document approved deviations.

# Design Handoff Context

Create the handoff with these sections and headings:

0. Handoff Metadata
   - Handoff ID.
   - Workstream.
   - Status: Draft, Analyzed, Approved, Superseded, or Archived.
   - Source.
   - Created At.
   - Analyzed At.
   - Approved At.
   - Supersedes.
   - Archived Context.

1. App Context
   - What app/product is this?
   - Who are the users?
   - What problem or workflow does this design support?

2. Design Objective
   - What should this design achieve?
   - What is the user/business goal?
   - What is in scope and out of scope?

3. Included Screens And Artifacts
   - List every screen, variant, breakpoint, screenshot, prototype, export, or asset.
   - Mention source filenames or links when available.
   - Note missing screens or unclear references.

4. Main User Flows
   - Describe the primary flows step by step.
   - Include entry points, exits, navigation, and decision points.

5. Expected Functionality
   - Describe what the user can do.
   - Include forms, validation, filters, search, sorting, uploads, downloads, notifications, settings, admin actions, or other functional behavior.

6. Required States
   - Loading.
   - Empty.
   - Error.
   - Disabled.
   - Success.
   - Default, hover, focus, active/pressed, and selected states when relevant.

7. Responsive Rules
   - Desktop/tablet/mobile behavior if known.
   - Breakpoints or layout shifts.
   - Minimum supported width.
   - What content changes, collapses, hides, stacks, or remains fixed.

8. Expected Components
   - List components implied by the design.
   - Note reusable patterns, variants, design tokens, icons, imagery, spacing, typography, color, elevation, radius, and motion.
   - Note named technologies, frameworks, component libraries, exported code, or production constraints.

9. Interactions And Behavior
   - Click/tap behavior.
   - Keyboard behavior.
   - Focus management.
   - Modals/drawers/dropdowns/tooltips.
   - Animations/transitions.
   - Confirmation or destructive action behavior.

10. Data And API Needs
   - Data shown on each screen.
   - User input data.
   - API calls likely needed.
   - Realtime, pagination, caching, import/export, files, auth, permissions, roles, or audit needs.

11. Accessibility Requirements
   - Labels, names, roles.
   - Contrast.
   - Keyboard navigation.
   - Focus indicators.
   - Screen reader expectations.
   - Reduced motion.
   - Touch target size.

12. Must Respect Exactly
   - Visual or behavioral details that should match the design closely.

13. May Be Adapted
   - Details that may change to fit the target framework, design system, accessibility, performance, or implementation constraints.

14. Implementation Technology Notes
   - Required technologies.
   - Preferred technologies.
   - Disallowed technologies or constraints.
   - Asset handling.
   - Framework or component mapping.

15. Open Questions
   - List unclear, missing, or risky items as direct questions.
   - For each question, include why it matters and what it blocks.

Keep the output practical for implementation. Avoid marketing language. Prefer precise
bullets. If something is unknown, write `TBD` and add an open question.
```
