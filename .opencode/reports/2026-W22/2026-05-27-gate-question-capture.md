# Gate Question Capture Update

Date: 2026-05-27
Type: OpenCode customization

## Summary

Updated Gate 0, Gate 1, and open question handling so relevant product and technical
questions are captured early with a clear space for user answers.

## Changes

- Updated Gate 0 to identify product, UX, technical, data, security, integration,
  deployment, and testing unknowns.
- Updated Gate 1 to capture product and technical questions that affect scope,
  feasibility, acceptance criteria, sequencing, integrations, data, security, or tests.
- Replaced the table in `.opencode/open-questions.md` with reusable question
  blocks containing blank fenced `User Answer` areas.
- Added global agent guidance to use the question block template.
- Recorded ADR 005.

## Verification

- Reviewed Gate 0, Gate 1, command prompts, global instructions, and the open questions
  template.
- Confirmed each question block has an easy-to-fill `User Answer` area.
