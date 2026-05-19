## Context

The current app uses a simple three-pane layout and a symbolic pixel table scene. It runs correctly, but its stage has low object density, weak environmental storytelling, and insufficient visual hierarchy compared with the PixelHQ reference. The product needs to feel like a real operational desktop tool rather than a prototype demo.

The implementation must remain original. It can borrow category-level patterns from PixelHQ, Microsoft Fluent, Google Material, and ByteDance enterprise UI practices, but it must not copy closed-source PixelHQ assets or exact composition.

## Goals / Non-Goals

**Goals:**
- Make the first viewport read as a polished pixel-office product: dense but legible, workspace-like, and stateful.
- Preserve a modern productivity shell with clear form hierarchy, comfortable scanning, and accessible controls.
- Express AI role state through environment, desks, monitors, character posture, badges, and debate-log cards.
- Keep the UI self-contained in React/CSS, without adding raster assets or changing the Codex OAuth backend.

**Non-Goals:**
- No PixelHQ asset extraction, tracing, or direct reproduction.
- No change to multi-agent prompting or `codex exec` orchestration.
- No notarized production distribution in this change.

## Decisions

1. Use CSS-rendered pixel art instead of image assets.
   - Rationale: keeps the implementation original, inspectable, and easy to iterate.
   - Alternative considered: generated bitmap sprites. Rejected for this pass because CSS gives faster layout tuning and avoids asset pipeline overhead.

2. Reframe the stage as a top-down office map.
   - Rationale: the reference succeeds because desks, floor tiles, plants, shelves, monitors, boards, and lounge zones create believable space. The app should use the same density principle with original composition.
   - Alternative considered: retain debate table and only improve colors. Rejected because the core problem is spatial richness, not palette.

3. Keep enterprise shell conventions outside the pixel stage.
   - Rationale: Microsoft/Google/ByteDance-style product standards are strongest for hierarchy, spacing, accessible controls, and readable state surfaces; pixel art should be the domain visualization, not the whole app chrome.
   - Alternative considered: make all controls pixel-styled. Rejected because it would hurt productivity ergonomics and text readability.

4. Use fixed stage zones with responsive constraints.
   - Rationale: pixel scenes break easily when objects reflow fluidly. The stage should keep stable coordinates and adjust by scaling/overflow rules.
   - Alternative considered: full CSS grid auto-placement. Rejected because it weakens the top-down map illusion.

## Risks / Trade-offs

- CSS pixel art can become verbose → Keep classes scoped to stage objects and avoid over-abstracting before the scene stabilizes.
- Dense stage can reduce readability → Keep operational text in the side panels and use concise stage labels only.
- Desktop performance may drop if animations are excessive → Limit animations to active-role pulse/hop and monitor blink effects.
- Product standards are not literal vendor checklists → Translate them into concrete heuristics: 8px spacing rhythm, clear focus states, contrast, semantic controls, restrained shell, and predictable scanning.
