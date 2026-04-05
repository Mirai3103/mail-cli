# Phase 7: Clean Architecture Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the mail-cli source code into Clean Architecture layers with dependency injection. The CLI interface (commands, flags, JSON output format) must remain functionally identical — only the internal code organization changes.

**Deliverables:**
- `commands/` folder with CLI command handlers (presentation layer)
- `services/` folder with use cases (application layer)
- `types/` folder with domain types and port interfaces (domain layer)
- `infrastructure/` folder with provider/config/token implementations (infrastructure layer)
- A `container.ts` that wires dependencies via manual constructor injection
- Business logic has zero imports from `commander`

</domain>

<decisions>
## Implementation Decisions

### D-01: DI Container — Manual Constructor Injection
- **Decision:** No DI library. Explicit `constructor(param: PortInterface)` in all injectable classes.
- **Rationale:** Simpler, no extra dependency, explicit wiring, easy to trace.
- **Implementation:** A single `container.ts` file wires all dependencies at startup.
- **Downstream:** Researcher should look for TypeScript constructor injection patterns; planner should create `container.ts` that constructs and wires all services.

### D-02: Use Case Granularity — Coarse-grained by Domain
- **Decision:** 4-5 use cases, coarse-grained by domain area.
- **Specific use cases:**
  - `MailboxService` — list emails, mailbox status, list folders
  - `EmailService` — read email, read thread, search emails
  - `ComposeService` — send email, reply
  - `AccountService` — add/remove/list accounts (OAuth + token management)
- **Rationale:** Balanced between simplicity (not 10+ tiny classes) and separation (not one giant class). Mirrors the natural domain boundaries.
- **Downstream:** Researcher should look for service class patterns; planner should define the 4 service classes with their public methods.

### D-03: Port Interfaces — TokenStoragePort + ConfigPort
- **Decision:** Define two new port interfaces in `types/` in addition to the existing `EmailProvider`:
  - `TokenStoragePort` — `saveTokens`, `getTokens`, `deleteTokens`, `listAccounts`, `refreshAccessToken`
  - `ConfigPort` — `loadConfig`, `getConfigPath`
- **EmailProvider** abstract class is already a port (treat as `EmailProviderPort`).
- **HTTP client:** Remains a direct import (no port needed for Phase 7).
- **Downstream:** Researcher should look at current `auth/oauth.ts` and `utils/config.ts` to understand what the implementations look like; planner should define the interface signatures.

### D-04: Port Interface Location — `types/` folder
- **Decision:** Port interfaces (TokenStoragePort, ConfigPort, EmailProviderPort) live in `types/` alongside domain types (Email, Attachment, Folder, SendEmailOptions).
- **Rationale:** Keeps related types together. `types/` = domain + ports, `infrastructure/` = implementations.
- **Downstream:** Planner should create `types/ports.ts` or separate files per port.

### D-05: Layer Structure — 4 folders: `commands/`, `services/`, `types/`, `infrastructure/`
- **Decision:** Use 4 folders matching the 4 Clean Architecture layers:
  - `commands/` — CLI presentation layer (commander Command objects, option parsing, output formatting)
  - `services/` — Application layer (use cases: MailboxService, EmailService, ComposeService, AccountService)
  - `types/` — Domain layer (entities: Email, Attachment, Folder; port interfaces: EmailProviderPort, TokenStoragePort, ConfigPort)
  - `infrastructure/` — Infrastructure layer (GmailProvider, OutlookProvider, token storage impl, config impl)
- **Mapping confirmed:**
  - `commands/` replaces the command-handling logic in current `cli.ts`
  - `services/` replaces the business logic currently embedded in `cli.ts` action callbacks
  - `types/` holds domain types + port interfaces
  - `infrastructure/` holds concrete implementations of the ports
- **Downstream:** Researcher should map current `cli.ts` logic to services and current providers to infrastructure.

### D-06: Migration Strategy — Bottom-up
- **Decision:** Build from inner layers outward: `types/` → `infrastructure/` → `services/` → `commands/`.
- **Rationale:** Infrastructure layer has no dependencies; services depend on ports/types; commands depend on services. Bottom-up ensures each layer is ready before the next is built.
- **Downstream:** Planner should sequence tasks: (1) create folder structure + types, (2) create port interfaces, (3) implement infrastructure, (4) implement services, (5) wire container + commands.

### D-07: Commands Still in `cli.ts` or Moved?
- **Decision:** CLI commands (commander setup) move to `commands/` folder. Each command in its own file (e.g., `commands/list.ts`, `commands/send.ts`).
- **CLI entry point:** `src/cli.ts` becomes a thin bootstrap that imports commands and registers them with commander, then calls `program.parse()`.
- **Rationale:** Keeps commander imports isolated to presentation layer. `cli.ts` becomes a simple orchestrator.
- **Downstream:** Planner should plan how to split `cli.ts` (700+ lines) into per-command files.

### D-08: Container Location
- **Decision:** `container.ts` lives in `src/` root alongside the renamed `cli.ts`.
- **Alternative considered:** Container inside `services/` — rejected because container crosses layers (wires infrastructure into services).
- **Downstream:** Planner should define container exports and how commands/services access it.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ARCH-01, ARCH-02, ARCH-03, ARCH-04, DI-01, DI-02, DI-03

### Project
- `.planning/PROJECT.md` — Core value: zero-friction, flag-based CLI, JSON output, no TTY
- `.planning/ROADMAP.md` — Phase 7 success criteria

### Existing Code (for mapping)
- `src/cli.ts` — Current monolithic CLI (700+ lines, all commands, needs restructuring)
- `src/providers/email-provider.ts` — Existing EmailProvider abstract class (will become EmailProviderPort)
- `src/auth/oauth.ts` — Token storage functions (saveTokens, getTokens, etc.) → TokenStoragePort implementation
- `src/utils/config.ts` — Config loading → ConfigPort implementation
- `src/providers/gmail-provider.ts` — Gmail provider → infrastructure/ implementation
- `src/providers/outlook-provider.ts` — Outlook provider → infrastructure/ implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmailProvider` abstract class — already a proper port interface, just needs renaming to `EmailProviderPort`
- `Email`, `Attachment`, `Folder`, `SendEmailOptions` types — already well-defined domain types
- `saveTokens`, `getTokens`, `deleteTokens`, `listAccounts` functions — extractable to `TokenStoragePort` implementation
- `loadConfig` function — extractable to `ConfigPort` implementation
- Existing tests in `src/providers/gmail-provider.test.ts`, `src/email/parser.test.ts`, `src/email/composer.test.ts` — reference current paths, will need updating

### Established Patterns
- JSON-only output: `console.log(JSON.stringify(result))` — no change
- Error handling: `CLIError` with code + message, `printError` — needs to remain accessible to commands
- Account resolution: `resolveProvider()` in `cli.ts` — this is CLI logic, stays in commands layer
- Auth flow: OAuth2 browser flow for Gmail, MSAL device code for Outlook — infrastructure concern

### Integration Points
- CLI entry (`cli.ts`) → commands → services → ports → infrastructure
- Container wires: `GmailProvider` + `TokenStorageImpl` + `ConfigImpl` → `MailboxService` / `EmailService` / etc.
- Commands receive services via constructor: `new ListCommand(mailboxService)`
- `commander` imports only in `commands/` layer

</code_context>

<specifics>
## Specific Ideas

**Backward compatibility:** All existing CLI commands must produce identical output. Verify by running the full test suite (evals.json) after refactor and comparing output.

**No new features:** Phase 7 is purely structural. No new commands, no new behavior — only reorganization.

**CLI commands keep resolving provider:** The `resolveProvider()` function is CLI-specific logic (account resolution). It stays in the commands layer, not in services.

**Error codes remain the same:** `CLIError` codes (NO_ACCOUNTS, MULTIPLE_ACCOUNTS, etc.) are part of the public contract and must remain unchanged.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-clean-architecture-foundation*
*Context gathered: 2026-04-05*
