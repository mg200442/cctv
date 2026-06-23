---
name: create-visual-mockups
description: Create or review production-quality visual mockups with layout, responsive ergonomics, accessibility, and design-system consistency before implementation.
compatibility: opencode
---

# Skill: Create Visual Mockups

Document mockups in `.opencode/docs/design/mockups.md`.

Cover desktop, tablet, mobile, layout, spacing, color, typography, states, accessibility, responsive behavior, and approval status.

## External Design Handoff

If designs are provided outside OpenCode, use `.opencode/design-handoff/` as the input folder.

Review:

- `context.md` for app context, flows, functionality, states, responsive rules, components, data/API needs, accessibility, exact requirements, adaptable details, and open questions.
- Any supporting screenshots, exported images, prototypes, HTML/CSS, videos, assets, or links placed in the folder.

Do not copy external HTML/CSS directly into the app unless explicitly approved. Instead, extract visual intent, responsive rules, components, and design tokens, then document implementation guidance in `.opencode/docs/design/mockups.md`.

Required approval notes:

- Handoff context and supporting files reviewed.
- Missing states or assets.
- Accessibility risks.
- What must match exactly.
- What may be adapted.
- Approval status and approver.
