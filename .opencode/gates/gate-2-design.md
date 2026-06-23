# Gate 2 Design Needs Template

## Outputs

- `.opencode/docs/design/ux-notes.md`
- `.opencode/docs/design/accessibility-notes.md`
- `.opencode/docs/localization/i18n-notes.md` when relevant
- `.opencode/design-handoff/context.md` reviewed/updated when external designs are provided
- `.opencode/project-status.md`

## Exit Criteria

- Primary flows, states, accessibility needs, and responsive needs are known.
- Mockup requirements are clear or marked not applicable.
- If `.opencode/design-handoff/` contains external designs, the UX review starts from `.opencode/design-handoff/context.md` and identifies missing states, unclear interactions, responsive gaps, and accessibility risks before Gate 3.
- If the design is already prepared, all supplied screens, states, assets, prototypes, exported HTML/CSS, technology notes, and responsive variants have been reviewed.
- The design source of truth is clear: external handoff, OpenCode-created mockups, or design not applicable.
- Target technologies and design-system constraints mentioned by the handoff are captured for Gate 4 and Gate 5.
- `.opencode/project-status.md` shows design blockers and the recommended next action.

## External Design Handoff Checklist

- Confirm `.opencode/design-handoff/context.md` covers app context, design objective, screens, flows, functionality, states, responsive rules, components, interactions, data/API needs, accessibility, exact requirements, adaptable details, and open questions.
- Confirm provided files are reference material unless explicitly approved as production-ready.
- Extract user flows, states, interactions, content hierarchy, and input behavior from the handoff context and supporting files.
- Extract named technologies, frameworks, component libraries, asset formats, exported code constraints, and design-system rules.
- Mark exact-match requirements for layout, spacing, typography, color, imagery, motion, content, interactions, and responsive behavior.
- Add unresolved questions to `.opencode/open-questions.md`.
- Reflect blocking questions in `.opencode/project-status.md` using `Blocked By: Q-XXX`.
