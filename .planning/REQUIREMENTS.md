# Requirements: mail-cli

**Defined:** 2026-04-05
**Core Value:** A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

## v1 Requirements

Requirements for v1.1 Architecture Refactor milestone.

### Architecture (ARCH)

- [ ] **ARCH-01**: Source code restructured into Clean Architecture layers (presentation/, application/, infrastructure/, domain/)
- [ ] **ARCH-02**: CLI commands separated from business logic — commands delegate to use cases
- [ ] **ARCH-03**: Clear interface boundaries between layers using port interfaces (EmailProviderPort, TokenStoragePort, ConfigPort)
- [ ] **ARCH-04**: Existing CLI commands and flags remain functionally unchanged

### Dependency Injection (DI)

- [ ] **DI-01**: Services and data clients injectable via constructor injection
- [ ] **DI-02**: DI container wires infrastructure to use cases
- [ ] **DI-03**: Mock implementations injectable for unit testing

### Unit & Integration Testing (TEST)

- [ ] **TEST-01**: Unit tests for all use case implementations
- [ ] **TEST-02**: Unit tests for command handlers (presentation layer)
- [ ] **TEST-03**: Integration tests for token storage operations (read/write/delete)
- [ ] **TEST-04**: Integration tests for config storage operations
- [ ] **TEST-05**: Test coverage ≥80% for business logic (use cases, domain types)
- [ ] **TEST-06**: All tests pass via `bun test`

### Logging & Error Handling (LOG)

- [ ] **LOG-01**: Centralized logging service with configurable log levels
- [ ] **LOG-02**: Log output to stderr (JSON format) for pipeline-friendly output
- [ ] **LOG-03**: Global error handler that catches unhandled exceptions and formats as JSON error response
- [ ] **LOG-04**: CLI exit codes follow convention: 0 success, 1 usage error, 2 server error, 3 auth error

### Code Quality (QUAL)

- [ ] **QUAL-01**: No magic numbers — all constants named and exported
- [ ] **QUAL-02**: ESLint/Prettier (via Biome) passes on all source files
- [ ] **QUAL-03**: `bun run lint` passes with no warnings
- [ ] **QUAL-04**: `bun run format` produces consistent formatting

### CI/CD Pipeline (CICD)

- [ ] **CICD-01**: GitHub Actions workflow runs on push and pull request
- [ ] **CICD-02**: CI pipeline runs `bun run lint` and `bun test`
- [ ] **CICD-03**: CI pipeline uploads test coverage report as artifact

### Documentation (DOCS)

- [ ] **DOCS-01**: Architecture diagram showing Clean Architecture layers and data flow
- [ ] **DOCS-02**: README.md updated to reflect new folder structure
- [ ] **DOCS-03**: CONTRIBUTING.md with testing and linting instructions

### Attachment Download (ORG-06)

- [ ] **ORG-06**: User can download attachments to local filesystem via `--download` flag
- [ ] **ORG-06a**: Attachments saved to user-specified directory or current directory
- [ ] **ORG-06b**: Original filename preserved from Content-Disposition header
- [ ] **ORG-06c**: Streaming download for large attachments (no full in-memory load)

### Draft Management (SEND-05)

- [ ] **SEND-05**: User can save email as draft without sending via `--save-draft` flag
- [ ] **SEND-05a**: User can list saved drafts via `mail-cli drafts --list`
- [ ] **SEND-05b**: User can load and edit a draft via `mail-cli send --draft <id>`
- [ ] **SEND-05c**: User can delete a draft via `mail-cli drafts --delete <id>`

## v2 Requirements

Not in scope for v1.1. Deferred for future milestones.

### Search Abstraction

- **SCH-ABST-01**: Query abstraction layer translating universal filters to provider-native syntax
- **SCH-ABST-02**: High-level filter flags (--from, --to, --since, --attachment) work across providers

### Batch Operations

- **BATCH-01**: Parallel processing for batch operations with configurable concurrency

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline mode | Online-only for v1 |
| Interactive TUI | Flag-based CLI only |
| IMAP support | Gmail API / Microsoft Graph only |
| Local search index | Server-side search only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 7 | Pending |
| ARCH-02 | Phase 7 | Pending |
| ARCH-03 | Phase 7 | Pending |
| ARCH-04 | Phase 7 | Pending |
| DI-01 | Phase 7 | Pending |
| DI-02 | Phase 7 | Pending |
| DI-03 | Phase 7 | Pending |
| TEST-01 | Phase 8 | Pending |
| TEST-02 | Phase 8 | Pending |
| TEST-03 | Phase 8 | Pending |
| TEST-04 | Phase 8 | Pending |
| TEST-05 | Phase 8 | Pending |
| TEST-06 | Phase 8 | Pending |
| LOG-01 | Phase 9 | Pending |
| LOG-02 | Phase 9 | Pending |
| LOG-03 | Phase 9 | Pending |
| LOG-04 | Phase 9 | Pending |
| QUAL-01 | Phase 9 | Pending |
| QUAL-02 | Phase 9 | Pending |
| QUAL-03 | Phase 9 | Pending |
| QUAL-04 | Phase 9 | Pending |
| CICD-01 | Phase 10 | Pending |
| CICD-02 | Phase 10 | Pending |
| CICD-03 | Phase 10 | Pending |
| DOCS-01 | Phase 10 | Pending |
| DOCS-02 | Phase 10 | Pending |
| DOCS-03 | Phase 10 | Pending |
| ORG-06 | Phase 11 | Pending |
| ORG-06a | Phase 11 | Pending |
| ORG-06b | Phase 11 | Pending |
| ORG-06c | Phase 11 | Pending |
| SEND-05 | Phase 12 | Pending |
| SEND-05a | Phase 12 | Pending |
| SEND-05b | Phase 12 | Pending |
| SEND-05c | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after v1.1 roadmap created*
