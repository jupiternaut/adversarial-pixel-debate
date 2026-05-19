## ADDED Requirements

### Requirement: Pixel-office stage
The system SHALL render an original pixel-office stage that communicates a believable AI operations room, including distinct floor/wall zones, multiple workstations, monitors, wall artifacts, plants or shelves, and a central debate area.

#### Scenario: First viewport conveys office density
- **WHEN** the app opens on a desktop viewport
- **THEN** the center stage contains at least three visually distinct office zones and at least ten non-character environmental objects.

#### Scenario: The stage remains original
- **WHEN** comparing the stage with PixelHQ reference imagery
- **THEN** the app uses its own composition, labels, colors, and CSS-rendered objects rather than copied PixelHQ assets.

### Requirement: Role state visualization
The system SHALL show each debate role with a visible character, role-specific desk or position, speech bubble, status badge, and state-dependent visual treatment.

#### Scenario: Role starts speaking
- **WHEN** a role receives the `speaking` state
- **THEN** that role has a visible active animation or highlight without shifting surrounding layout.

#### Scenario: Role completes
- **WHEN** a role receives the `done` state
- **THEN** the stage and log both show completion using consistent status language and elapsed time where available.

### Requirement: Modern desktop shell
The system SHALL use a production-grade three-pane desktop shell with clear visual hierarchy, accessible form controls, readable log cards, and predictable spacing.

#### Scenario: Control panel is scan-friendly
- **WHEN** the user scans the left input panel
- **THEN** the fields are grouped, labeled, and sized so the primary action remains visible on common desktop heights.

#### Scenario: Debate log is readable
- **WHEN** role outputs are present
- **THEN** the right panel preserves line breaks, uses readable text scale, and separates role metadata from long output content.

### Requirement: Standards-oriented interaction polish
The system SHALL satisfy basic Microsoft/Google/ByteDance-style UI heuristics: high contrast text, visible focus states, consistent spacing rhythm, semantic controls, restrained product chrome, and responsive behavior without overlapping text.

#### Scenario: Keyboard focus is visible
- **WHEN** a keyboard user focuses an input, select, checkbox, button, or copy control
- **THEN** a visible focus ring appears with sufficient contrast.

#### Scenario: Desktop window resize remains coherent
- **WHEN** the window is resized from wide desktop to tablet-width layout
- **THEN** panels reflow without text overlap, clipped controls, or stage-object collisions that block core controls.
