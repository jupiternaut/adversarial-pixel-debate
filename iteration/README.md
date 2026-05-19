# Iteration Control Loop

This folder is the project's local version-control plane. It does not replace Git; it gives the prototype a controlled loop before the directory is converted into a formal repository.

## Operating Model

1. **OpenSpec defines the contract.**
   - Create a change for every material iteration.
   - Keep proposal, design, specs, and tasks aligned.
   - Do not accept a version until required OpenSpec artifacts and tasks are complete.

2. **ChatDev defines the handoffs.**
   - Product Lead frames the version goal.
   - Architect turns it into OpenSpec constraints.
   - Interaction Designer defines UI quality checks.
   - Programmer implements.
   - Tester runs gates.
   - Reviewer writes the ledger entry.

3. **OpenEvolve explores candidates.**
   - Candidate programs live under `openevolve/adversarial-pixel-debate/`.
   - The evaluator scores candidate iteration plans.
   - Winning candidates are still applied through a normal OpenSpec change.
   - OpenEvolve must not mutate `src/`, `server/`, or `electron/` directly unless a future OpenSpec change explicitly allows that.

## Commands

```bash
npm run iterate:scan
npm run iterate:score
npm run iterate:gate
```

Record an accepted version:

```bash
npm run iterate:record -- \
  --id baseline-pixel-office-v0.1 \
  --status accepted \
  --summary "Baseline after pixel-office redesign" \
  --change upgrade-pixel-office-ui \
  --evidence /tmp/adversarial-pixel-debate-redesign-done-2.png
```

Evaluate the seed OpenEvolve candidate without running a model:

```bash
npm run iterate:evolve:eval
```

Run a real OpenEvolve search only after an OpenAI-compatible provider is configured:

```bash
npm run iterate:evolve:ui
```

## Acceptance Rule

A version is accepted only when all of these are true:

- The OpenSpec change exists and its required artifacts are complete.
- `npm run iterate:gate` passes.
- UI changes have screenshot evidence.
- The reviewer appends one JSON object to `iteration/version-ledger.jsonl`.

## Score Dimensions

- `openspecGovernance`: proposal/spec/task discipline.
- `workflowControl`: local scripts and ledger availability.
- `pixelOfficeDensity`: object density, role placement, and stage state richness.
- `desktopProductPolish`: shell hierarchy, focus states, responsive rules, and accessible controls.
- `verificationReadiness`: test/build scripts and generated artifacts.

Scores are advisory. A high score does not override a failed test, broken build, or bad screenshot.
