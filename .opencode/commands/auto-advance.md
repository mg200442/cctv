---
description: Run the next explicitly approved gate or slice.
agent: orchestrator
---

Read `.opencode/project-status.md`, `.opencode/open-questions.md`, and `.opencode/tasks/backlog.md`.

Rules:

- Read `Automation Settings` first.
- If `Workspace Mode` is `Uninitialized` or missing, stop and recommend `/bootstrap-workspace`.
- If `Enabled` is not `Yes`, stop without consuming the queue.
- If `Mode` is `Report Only`, report what would run but do not start work.
- Treat `Max Items Per Run` as the maximum number of `Approved` queue items that may run in this invocation.
- `Max Items Per Run` must be a positive integer. If it is empty, invalid, or less than `1`, stop and report `Blocked`.
- Start nothing unless at least one queue item is marked `Approved`.
- Select up to `Max Items Per Run` items from `.opencode/project-status.md` `Next Actions Queue` marked `Approved`, ordered by ascending `Order`.
- Run selected items sequentially, never in parallel.
- For each selected item, complete the full cycle before starting the next selected item:
  1. If `Approved By` is empty or `TBD`, set it to the queue default approver.
  2. Confirm the item has a concrete target gate, slice, or planning task.
  3. Confirm the current Git branch matches the workstream branch strategy when the item belongs to a workstream.
  4. Stop the invocation and mark/report the current item `Blocked` when relevant open questions affect it.
  5. Before starting work, delegate to `git-committer` to inspect status, review relevant diffs, and create a fallback commit.
  6. If no relevant uncommitted changes exist, create an empty fallback commit.
  7. Run only the current approved item.
  8. When the item reaches `Completed`, `Blocked`, or `Consumed`, set `Finished At` using `YYYY-MM-DD HH:MM Europe/London`, update `.opencode/project-status.md`, update reports, record verification, and delegate to `git-committer` for the Git handoff or commit required for that item.
  9. Only after the report and Git handoff are complete, continue to the next selected approved item if the per-run limit has not been reached.
- Leave `Finished At` as `TBD` while any item is `Proposed`, `Needs Approval`, `Approved`, or `In Progress`.

Arguments:

`$ARGUMENTS`
