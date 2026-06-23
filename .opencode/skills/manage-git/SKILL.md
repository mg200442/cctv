---
name: manage-git
description: Safely inspect, stage, commit, branch, push, or prepare handoff for repository changes through git-committer and orchestrator escalation.
compatibility: opencode
---

# Skill: Manage Git

Use when the orchestrator or `git-committer` needs Git state, repository initialization, fallback commits, commits, safe branch movement, routine pushes, or handoff summaries.

Workflow:

1. Check whether the workspace is already a Git repository with `git rev-parse --is-inside-work-tree`.
2. If it is not a repository, run `git init` before any status, fallback, or commit workflow.
3. Run `git status --short`.
4. Review relevant diffs before staging.
5. Identify unrelated changes and leave them untouched.
6. Run required verification or document why not run.
7. Stage only intended files.
8. Commit with a concise message when requested or required by automation.
9. Push only when requested by the orchestrator, automation rules, or the active slice.
10. Report commit hash, files, push result, verification, and risks.

`git-committer` owns routine Git execution. Escalate to the orchestrator before destructive operations, force-pushes, hard resets, non-fast-forward merges, conflicted rebases or merges, branch deletion, tag/release work, or ambiguous ownership.
