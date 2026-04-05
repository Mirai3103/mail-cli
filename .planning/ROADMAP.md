# Roadmap: mail-cli

**Project:** mail-cli
**Created:** 2026-04-04
**Last Updated:** 2026-04-05

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-05)
- 🚧 **v1.1 Architecture Refactor** — Phases 7-12 (in progress)
- 📋 **v2.0** — Phases 13+ (planned)

## Overview

v1.1 restructures the CLI app for maintainability, modularity, and testability while preserving the existing CLI experience unchanged. Starting from the v1.0 foundation, we refactor to Clean Architecture with dependency injection, add comprehensive test coverage, implement centralized logging with proper error handling, set up CI/CD, and deliver two highly-requested features: attachment download and draft management.

## Phases

- [ ] **Phase 7: Clean Architecture Foundation** - Folder structure, interfaces, DI container
- [ ] **Phase 8: Unit & Integration Testing** - Test infrastructure, ≥80% coverage
- [ ] **Phase 9: Logging, Error Handling & Code Quality** - Centralized logging, global error handler, linting
- [ ] **Phase 10: CI/CD Pipeline & Documentation** - GitHub Actions, architecture diagram, docs
- [ ] **Phase 11: Attachment Download** - Save attachments to local filesystem
- [ ] **Phase 12: Draft Management** - Save/load/edit/delete drafts

## Phase Details

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-05</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-04-04
- [x] Phase 2: Gmail Provider (2/2 plans) — completed 2026-04-04
- [x] Phase 3: Core Commands (2/2 plans) — completed 2026-04-04
- [x] Phase 4: Email Management (3/3 plans) — completed 2026-04-04
- [x] Phase 5: Multi-Provider (2/2 plans) — completed 2026-04-05
- [x] Phase 6: Polish (5/5 plans) — completed 2026-04-05

</details>

### 🚧 v1.1 Architecture Refactor (In Progress)

**Milestone Goal:** Restructure CLI app for maintainability, modularity, and testability while preserving the existing CLI experience unchanged.

#### Phase 7: Clean Architecture Foundation
**Goal**: Source code restructured into Clean Architecture layers with dependency injection
**Depends on**: Phase 6 (last phase of v1.0)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, DI-01, DI-02, DI-03
**Success Criteria** (what must be TRUE):
  1. Source code lives in layered folders (presentation/, application/, infrastructure/, domain/)
  2. CLI commands delegate to use cases; business logic has no commander imports
  3. Provider, token storage, and config use port interfaces with implementations swappable
  4. Running any existing CLI command produces identical output to before refactor
  5. Services and data clients are injectable via constructor for testing
**Plans**: 3 plans
- [x] 07-01-PLAN.md — Types/ + Infrastructure layer (domain types, port interfaces, provider implementations)
- [x] 07-02-PLAN.md — Services/ layer (MailboxService, EmailService, ComposeService, AccountService)
- [x] 07-03-PLAN.md — Commands/ layer + container.ts + thin cli.ts bootstrap

#### Phase 8: Unit & Integration Testing
**Goal**: Comprehensive test suite with ≥80% coverage for business logic
**Depends on**: Phase 7
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. All use case implementations have unit tests
  2. All command handlers have unit tests
  3. Token storage operations (read/write/delete) have integration tests
  4. Config storage operations have integration tests
  5. `bun test` reports ≥80% coverage on business logic
  6. `bun test` exits with code 0 (all tests pass)
**Plans**: TBD

#### Phase 9: Logging, Error Handling & Code Quality
**Goal**: Centralized logging, global error handling, and enforced code quality standards
**Depends on**: Phase 8
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Logger service accepts configurable log levels (debug, info, warn, error)
  2. Log output is JSON format written to stderr (stdout untouched for data)
  3. Unhandled exceptions are caught and formatted as JSON error responses
  4. Exit codes follow convention: 0 success, 1 usage error, 2 server error, 3 auth error
  5. No magic numbers exist in codebase; all constants are named and exported
  6. `bun run lint` passes with zero warnings
  7. `bun run format` produces consistent formatting
**Plans**: TBD

#### Phase 10: CI/CD Pipeline & Documentation
**Goal**: Automated CI/CD pipeline and comprehensive documentation
**Depends on**: Phase 9
**Requirements**: CICD-01, CICD-02, CICD-03, DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow triggers on push and pull request
  2. CI pipeline runs `bun run lint` and `bun test` on every push
  3. CI pipeline uploads test coverage report as artifact
  4. Architecture diagram exists and shows Clean Architecture layers and data flow
  5. README.md reflects the new folder structure
  6. CONTRIBUTING.md explains how to run tests and lint locally
**Plans**: TBD

#### Phase 11: Attachment Download
**Goal**: Users can download email attachments to local filesystem
**Depends on**: Phase 10
**Requirements**: ORG-06, ORG-06a, ORG-06b, ORG-06c
**Success Criteria** (what must be TRUE):
  1. User can pass `--download` flag on read command to save attachments
  2. Attachments are saved to user-specified directory or current directory
  3. Original filename is preserved from Content-Disposition header
  4. Large attachments stream to disk without full in-memory load
**Plans**: TBD

#### Phase 12: Draft Management
**Goal**: Users can save, load, edit, and delete email drafts
**Depends on**: Phase 11
**Requirements**: SEND-05, SEND-05a, SEND-05b, SEND-05c
**Success Criteria** (what must be TRUE):
  1. User can pass `--save-draft` flag to compose command to save draft without sending
  2. User can run `mail-cli drafts --list` to see saved drafts
  3. User can pass `--draft <id>` to compose command to load and edit existing draft
  4. User can run `mail-cli drafts --delete <id>` to remove a draft
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-04-04 |
| 2. Gmail Provider | v1.0 | 2/2 | Complete | 2026-04-04 |
| 3. Core Commands | v1.0 | 2/2 | Complete | 2026-04-04 |
| 4. Email Management | v1.0 | 3/3 | Complete | 2026-04-04 |
| 5. Multi-Provider | v1.0 | 2/2 | Complete | 2026-04-05 |
| 6. Polish | v1.0 | 5/5 | Complete | 2026-04-05 |
| 7. Clean Architecture Foundation | v1.1 | 2/3 | In Progress|  |
| 8. Unit & Integration Testing | v1.1 | 0/? | Not started | - |
| 9. Logging, Error Handling & Code Quality | v1.1 | 0/? | Not started | - |
| 10. CI/CD Pipeline & Documentation | v1.1 | 0/? | Not started | - |
| 11. Attachment Download | v1.1 | 0/? | Not started | - |
| 12. Draft Management | v1.1 | 0/? | Not started | - |

---

*Last updated: 2026-04-05*
