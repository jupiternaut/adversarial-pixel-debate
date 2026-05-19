## ADDED Requirements

### Requirement: ChatDev-inspired role identity
The system SHALL render each debate role as a distinct professional pixel character inspired by virtual software company roles.

#### Scenario: Role identity is visible
- **WHEN** the stage renders all four characters
- **THEN** each character SHALL have a distinct hair/outfit/accessory combination beyond simple color swapping

### Requirement: Original generated role cards
The system SHALL generate role cards and portraits from local code and SHALL NOT import or package ChatDev PNG assets.

#### Scenario: Assets are generated
- **WHEN** `npm run assets` runs
- **THEN** the generated status atlas SHALL be written from `scripts/generate-war-room-assets.mjs`

### Requirement: Role art metadata
The system SHALL expose role art archetype metadata for every debate role.

#### Scenario: Role metadata is complete
- **WHEN** tests inspect `roleDefinitions`
- **THEN** every role SHALL include a software-company art role and a short badge label

### Requirement: Animation state preservation
The system SHALL preserve the existing animation states for all role cards.

#### Scenario: Role state changes
- **WHEN** a role is queued, speaking, done, or error
- **THEN** the stage SHALL continue selecting frames within the generated status atlas
