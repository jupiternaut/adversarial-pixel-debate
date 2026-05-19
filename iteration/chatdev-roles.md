# ChatDev-Inspired Roles

This project borrows ChatDev's role separation, not its code. The runtime debate roles stay Bull, Bear, Engineer, and Moderator. The engineering workflow uses these maker roles.

## Product Lead

- Owns the version question: what user problem does this iteration solve?
- Creates or approves the OpenSpec proposal.
- Output: one measurable version goal and stop condition.

## Architect

- Splits the goal into capabilities, interfaces, and constraints.
- Keeps Codex OAuth, Electron, Vite, and local-only boundaries intact.
- Output: OpenSpec design decisions and affected files.

## Interaction Designer

- Judges layout, visual hierarchy, accessibility, and pixel-office clarity.
- Turns vague feedback like "not PixelHQ-level" into concrete UI acceptance criteria.
- Output: quality dimensions and screenshot evidence requirements.

## Programmer

- Implements the smallest scoped patch that satisfies the current OpenSpec tasks.
- Avoids direct mutation outside the approved file set.
- Output: code changes and task checkbox updates.

## Tester

- Runs `npm run iterate:gate`.
- Adds browser or desktop screenshots when UI changed.
- Output: command evidence and failure notes.

## Reviewer

- Compares OpenSpec requirements, score output, screenshots, and test/build results.
- Accepts, rejects, or sends the candidate back for another evolution pass.
- Output: one append-only ledger entry.

## Handoff Order

1. Product Lead writes the version goal.
2. Architect creates or updates OpenSpec artifacts.
3. Interaction Designer defines the score dimensions and screenshot target.
4. Programmer implements the scoped patch.
5. Tester runs the gate and captures proof.
6. Reviewer records the version decision.

Small typo fixes can skip the full loop, but any UI, workflow, auth, packaging, or agent-orchestration change should use it.
