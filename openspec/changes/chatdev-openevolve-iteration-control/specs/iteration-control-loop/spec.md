## ADDED Requirements

### Requirement: OpenSpec-governed iterations
The system SHALL require every non-trivial product iteration to be represented by an OpenSpec change before implementation is accepted.

#### Scenario: Iteration has an OpenSpec change
- **WHEN** an iteration is recorded as accepted
- **THEN** the record SHALL include an OpenSpec change name and that change SHALL have its required artifacts completed

#### Scenario: Iteration has no OpenSpec change
- **WHEN** an iteration record omits the OpenSpec change name
- **THEN** the record command SHALL reject the entry unless it is explicitly marked as an exploratory note

### Requirement: ChatDev-style engineering roles
The system SHALL document a repeatable role workflow for planning, implementing, reviewing, testing, and releasing iterations.

#### Scenario: User starts a new version cycle
- **WHEN** a human or agent begins a material product change
- **THEN** the iteration guide SHALL identify the required role handoffs and their concrete outputs

### Requirement: Local iteration scoring
The system SHALL provide a local score command that evaluates the current app against explicit project quality dimensions.

#### Scenario: Score current version
- **WHEN** the score command runs from the project root
- **THEN** it SHALL output machine-readable JSON containing total score, dimension scores, and detected evidence

### Requirement: Acceptance gate
The system SHALL provide a gate command that runs status scan, local scoring, tests, and production build before a version is accepted.

#### Scenario: Gate succeeds
- **WHEN** scan, score, tests, and build all pass
- **THEN** the gate command SHALL exit successfully and provide enough console output to support a ledger entry

#### Scenario: Gate fails
- **WHEN** any gate step fails
- **THEN** the gate command SHALL exit non-zero before the version is recorded as accepted

### Requirement: Version ledger
The system SHALL maintain an append-only JSONL ledger for iteration decisions and evidence paths.

#### Scenario: Record accepted iteration
- **WHEN** the record command receives an iteration id, status, summary, and OpenSpec change
- **THEN** it SHALL append a JSON object with timestamp, status, summary, OpenSpec change, score snapshot, and evidence paths

### Requirement: OpenEvolve candidate sandbox
The system SHALL include OpenEvolve-compatible candidate and evaluator files that can score candidate iteration plans without mutating production source files.

#### Scenario: Evaluate candidate plan
- **WHEN** OpenEvolve or a human runs the candidate evaluator with a candidate program path
- **THEN** the evaluator SHALL return numeric metrics and artifacts describing whether the candidate improves the version loop safely
