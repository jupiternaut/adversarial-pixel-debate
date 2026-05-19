## Context

The project already has a working Electron/Vite desktop prototype and one completed OpenSpec change for the pixel-office redesign. The next problem is not a single feature; it is how to keep improving the product without losing control of scope, quality, and acceptance evidence.

ChatDev is useful here as a process metaphor: a virtual software company with distinct roles for planning, architecture, programming, testing, and documentation. OpenEvolve is useful as an evaluation loop: generate or compare candidate programs and keep the variants that score better under an explicit evaluator. OpenSpec remains the authority for requirements and acceptance.

## Goals / Non-Goals

**Goals:**

- Create a lightweight version-control plane that works even though this prototype directory is not currently a Git repository.
- Make every material iteration start from an OpenSpec change and end with a recorded acceptance decision.
- Define ChatDev-style roles that map to the app's actual work: product framing, architecture, implementation, UI review, testing, and release notes.
- Add deterministic local scoring scripts that can run before any LLM/evolutionary search.
- Add OpenEvolve scaffolding that can evaluate candidate UI/control-plane ideas in an experiment directory before any patch is applied to the app.

**Non-Goals:**

- Do not clone or vendor ChatDev into this app.
- Do not make OpenEvolve auto-edit production files in this pass.
- Do not require an OpenAI API key or read Codex OAuth secrets.
- Do not replace OpenSpec with an evolutionary loop; OpenEvolve proposes candidates, OpenSpec governs accepted changes.

## Decisions

1. Use OpenSpec as the version gate.
   - Rationale: OpenSpec already tracks proposals, specs, designs, tasks, and completion status in this project.
   - Alternative considered: raw Markdown changelog only. Rejected because it cannot enforce requirement-level acceptance.

2. Use a JSONL ledger for iteration records.
   - Rationale: Appending one record per candidate/version is simple, diffable, and works before the project becomes a Git repo.
   - Alternative considered: SQLite. Rejected because a database is unnecessary for a small local prototype.

3. Keep OpenEvolve in a sandboxed experiment path.
   - Rationale: OpenEvolve is strongest when exploring many candidates, but this app needs controlled, reviewable changes.
   - Alternative considered: let OpenEvolve rewrite `src/` directly. Rejected because it makes regressions and provenance harder to audit.

4. Score UI/control-plane quality with explicit heuristics first.
   - Rationale: screenshots and human review are still needed, but a fast local score catches missing objects, state coverage, responsive rules, OpenSpec status, and script availability.
   - Alternative considered: only visual inspection. Rejected because the user asked for version iteration and control, not one-off judging.

5. Treat ChatDev roles as workflow lanes, not runtime agents.
   - Rationale: The product already has Bull/Bear/Engineer/Moderator as end-user debate roles. The engineering workflow needs separate maker roles such as Product, Architect, Designer, Programmer, Tester, and Reviewer.
   - Alternative considered: reuse Bull/Bear/Engineer/Moderator for development. Rejected because decision debate roles do not cover implementation ownership.

## Risks / Trade-offs

- Heuristic score can overfit visible structure → keep it advisory and pair it with tests, build, and screenshot review.
- OpenEvolve normally expects API-key-backed model access → this change provides a safe scaffold and local evaluator; full evolutionary generation can be enabled only when a compatible provider is configured.
- Ledger without Git cannot fully protect against file rollback mistakes → record evidence paths and OpenSpec change names now; initialize Git later if this becomes a long-lived product.
- More process can slow small changes → mark only non-trivial changes as requiring the full loop; typo fixes can still use direct edits plus tests.

## Migration Plan

1. Add iteration docs, scoring scripts, ledger, and OpenEvolve scaffold.
2. Add npm scripts for scan, score, record, and gate.
3. Run the gate against the current UI redesign.
4. Record the current desktop prototype as the baseline iteration.

Rollback is file-level: remove `iteration/`, `openevolve/adversarial-pixel-debate/`, the new scripts, and the added package scripts.

## Open Questions

- Whether to initialize this project as a Git repository after the control plane is in place.
- Whether future OpenEvolve runs should use Codex CLI as the generator wrapper or an OpenAI-compatible model endpoint.
