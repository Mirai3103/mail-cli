# Phase 7: Clean Architecture Foundation - Discussion Log

**Discussed:** 2026-04-05
**Phase:** 7

## Areas Discussed

### 1. DI Container Approach

**Question:** How should we implement dependency injection?
**Options presented:**
- Manual constructor injection (Recommended) — No library. Explicit constructor(params) in all classes. A single container.ts wires dependencies. Simple, no new deps, easy to trace.
- Service locator pattern — A get<T>(key) function. More flexible but implicit — dependencies aren't visible in signatures.
- tsyringe or inversify — Full DI library with decorators. More framework-like but adds a runtime dependency and complexity.

**Answer:** Manual constructor injection (Recommended)

**Notes:** User confirmed the recommended approach. A single `container.ts` will wire all dependencies at startup. Manual DI means explicit `constructor(param: PortInterface)` in all injectable classes.

---

### 2. Use Case Extraction Strategy

**Question:** How should we identify and extract use cases from cli.ts?
**Options presented:**
- One use case per command operation — ListEmails, ReadEmail, SendEmail, SearchEmails, MarkEmail, MoveEmail, DeleteEmail. 7-10 use cases total. Simple, clear mapping.
- Coarser-grained by domain (Recommended) — MailboxUseCase (list, status, folders), EmailUseCase (read, thread, search), ComposeUseCase (send, reply), AccountUseCase (auth, list, remove). 4-5 use cases.
- Fine-grained by action — More classes but more flexible for future reuse.

**Answer:** Coarser-grained by domain (Recommended)

**Notes:** User confirmed the recommended coarse-grained approach. 4 service classes: MailboxService, EmailService, ComposeService, AccountService. This balances simplicity with separation.

---

### 3. Port Interface Definitions

**Question:** What additional port interfaces should we define?
**Options presented:**
- TokenStoragePort + ConfigPort (Recommended) — Define ports for token storage (saveTokens, getTokens, etc.) and config (loadConfig). HTTP client remains direct import.
- TokenStoragePort + ConfigPort + HttpClientPort — Also abstract the HTTP client behind a port. More flexible but adds complexity for the initial refactor.
- Full abstraction including EmailProviderPort — Everything behind ports. Most flexible but most complex for Phase 7.

**Answer:** TokenStoragePort + ConfigPort (Recommended)

**Notes:** User confirmed the recommended approach. 3 ports: EmailProviderPort (already exists as EmailProvider abstract class), TokenStoragePort, ConfigPort. HTTP client not abstracted.

---

### 4. Port Interface Location

**Question:** Where should the port interfaces (EmailProviderPort, TokenStoragePort, ConfigPort) live?
**Options presented:**
- types/ (next to domain types) (Recommended) — Ports like EmailProviderPort alongside domain types like Email, Attachment, Folder. Keeps related types together.
- infrastructure/ (next to implementations) — Ports in infrastructure/ as a bridge between infrastructure/ and services/. But interfaces are domain concepts, not infrastructure.

**Answer:** types/ (next to domain types) (Recommended)

**Notes:** User confirmed recommended approach. `types/` contains both domain entities (Email, Attachment, Folder) and port interfaces.

---

### 5. Layer Structure & Folder Organization

**Question:** What should the folder structure look like?
**Options presented:**
- presentation/ application/ domain/ infrastructure/ — Standard Clean Architecture naming
- commands/ services/ types/ infrastructure/ (Recommended) — Alternative naming closer to current structure. commands/ replaces presentation/, services/ replaces application/.
- cli/ usecases/ domain/ providers/ — Shorter names, more flattened.

**Answer:** commands/ services/ types/ infrastructure/ (Recommended)

**Notes:** User confirmed recommended approach. 4 folders:
- `commands/` — CLI presentation (commander Command objects, option parsing)
- `services/` — Application (use cases: MailboxService, EmailService, ComposeService, AccountService)
- `types/` — Domain (entities + port interfaces)
- `infrastructure/` — Infrastructure (provider impls, config impl, token storage impl)

---

### 6. Migration Strategy

**Question:** How should we migrate the existing code to the new structure?
**Options presented:**
- Bottom-up (Recommended) — Create infrastructure/ with port implementations first, then services/, then commands/. Work from inner layers outward.
- Top-down — Create the folder structure and move files first, then refactor imports/wiring. Faster to get structure in place.
- Parallel tracks — Set up structure, then have multiple subagents work on different layers simultaneously.

**Answer:** Bottom-up (Recommended)

**Notes:** User confirmed recommended approach. Infrastructure (no deps) → services (depends on ports) → commands (depends on services) → container wiring. Bottom-up ensures each layer is ready before the next is built.

---

## Summary

**Decisions made:** 6
**Gray areas explored:** 4
**Scope creep redirected:** 0

All decisions aligned with recommended defaults. Phase 7 will use:
- Manual constructor injection with a single `container.ts`
- 4 coarse-grained services by domain
- 3 port interfaces (EmailProviderPort, TokenStoragePort, ConfigPort) in `types/`
- 4-folder structure: `commands/`, `services/`, `types/`, `infrastructure/`
- Bottom-up migration strategy

