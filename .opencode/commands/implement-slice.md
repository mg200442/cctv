---
description: Implement one approved slice.
agent: orchestrator
---

Read the approved slice from `.opencode/project-status.md` and its target detail file when present. Confirm readiness, delegate routine Git setup and fallback commit creation to `git-committer`, implement only the approved scope, verify, report, update `.opencode/project-status.md`, delegate the final Git handoff or commit to `git-committer`, and stop.

When the slice implements a prepared design, verify against the approved handoff before reporting done. Use the named technologies and assets from the slice, and record any deviation as blocked unless it was already approved.

Arguments:

`$ARGUMENTS`
