# Domain Pitfalls: TypeScript CLI Clean Architecture Refactor

**Domain:** Refactoring existing TypeScript CLI application to Clean Architecture with dependency injection
**Project:** mail-cli (v1.1 Architecture Refactor milestone)
**Researched:** 2026-04-05
**Confidence:** MEDIUM — Based on established software design principles; web search tools were unavailable during research session

---

> **Note:** This file covers architecture refactoring pitfalls. For email/CLI runtime pitfalls, see the previous version of this file. The milestone context focuses on common mistakes when restructuring a working CLI app to be more testable and modular via Clean Architecture and DI.

---

## Critical Pitfalls

Mistakes that cause rewrites, defeat refactoring goals, or introduce new耦合.

### Pitfall 1: Anemic Domain Layer (Business Logic in Commands)

**What goes wrong:** CLI command handlers become thin wrappers that delegate to services, but all "business logic" lives in the services or, worse, still in the commands. Domain entities are data bags with only getters/setters.

**Why it happens:**
- Developers conflate "layered folders" with "Clean Architecture"
- Creating true domain entities with rich behavior feels like over-engineering for a CLI
- Existing code is mostly procedural (get email, format output) so domain objects end up as data-transfer objects in disguise
- "We can add behavior later" leads to anemic models that are never enriched

**Consequences:**
- Hard to unit test business rules in isolation from infrastructure
- Services become God objects with hundreds of methods
- Adding new features requires modifying multiple layers anyway
- Refactoring to Clean Architecture without extracting domain logic is just shuffling code

**Prevention:**
- Define domain entities even if simple (e.g., `Email`, `Draft`, `Attachment`, `Folder`)
- Domain entities should have behavior: `email.isUnread()`, `draft.hasRecipients()`, `folder.supportsHierarchy()`
- Services orchestrate domain objects; they should not contain business logic themselves
- Use value objects for validated concepts (e.g., `EmailAddress`, `FolderPath`, `MessageId`)
- Rule: If a class has only getters/setters and no behavior, it is not a domain object

**Better pattern:**
```typescript
// Anti-pattern: Anemic
class Email {
  constructor(
    public id: string,
    public subject: string,
    public body: string,
    public read: boolean  // raw data, no encapsulation
  ) {}
}

// Better: Rich domain
class Email {
  constructor(
    private readonly id: MessageId,
    private readonly headers: EmailHeaders,
    private readonly body: EmailBody,
    private readonly attachments: Attachment[],
    private read: boolean
  ) {}

  markAsRead(): Email {
    return new Email(this.id, this.headers, this.body, this.attachments, true);
  }

  isUnread(): boolean {
    return !this.read;
  }

  isFrom(sender: EmailAddress): boolean {
    return this.headers.from.equals(sender);
  }

  hasAttachments(): boolean {
    return this.attachments.length > 0;
  }
}
```

**Warning signs:** Classes named `*Dto`, `*Data`, `*Model` that contain only public properties; services with methods like `processEmail(data)` that take raw objects and return raw objects

---

### Pitfall 2: Premature or Lopsided Provider Abstraction

**What goes wrong:** Creating elaborate provider abstractions before understanding what actually differs between Gmail and Outlook leads to leaky abstractions that neither provider fits cleanly. Alternatively, not abstracting at all and having Gmail logic scattered throughout.

**Why it happens:**
- "Abstraction" feels like good architecture
- Hard to know what differs without implementing one provider fully first
- Teams abstract too early to avoid "coupling" or delay the second provider
- Gmail was built first, so Outlook gets force-fit into Gmail-shaped interfaces

**Consequences:**
- `EmailProvider` interface with 30+ methods, half of which throw `NotSupportedByProvider`
- Tests mock the abstraction, but real behavior differs from mock expectations
- Provider-specific features are crippled to fit the common interface
- Changing one provider requires touching the interface and all implementations

**Prevention:**
- Implement Gmail fully before creating any abstraction
- When adding Outlook, extract only the *actual* common patterns
- Accept that some operations are provider-specific; expose them directly without abstraction
- Prefer composition over inheritance for provider differences
- Use the Interface Segregation Principle: many small interfaces, not one God interface

**Better pattern for mail-cli:**
```typescript
// Concrete providers, not forced abstraction
interface EmailProvider {
  listEmails(folder: FolderPath, options?: ListOptions): Promise<Email[]>;
  sendEmail(email: OutboundEmail): Promise<MessageId>;
  // Only methods that naturally belong to all providers
}

// Gmail-specific extensions accessed via provider-specific interface
interface GmailProvider extends EmailProvider {
  getThread(threadId: string): Promise<Thread>;
  modifyLabels(messageId: MessageId, addLabels: Label[], removeLabels: Label[]): Promise<void>;
}

interface OutlookProvider extends EmailProvider {
  // Outlook-specific methods
}

// Only abstract what is genuinely common
// Provider-specific features accessed via typed cast or separate interface
```

**Warning signs:** `NotSupportedException` in shared interface; interface methods that do nothing or return null/empty for one provider; mock tests that don't reflect real provider behavior

---

### Pitfall 3: DI Container as Service Locator

**What goes wrong:** Using a DI container where services call `container.get<Service>()` instead of receiving dependencies via constructor injection.

**Why it happens:**
- Manual constructor injection feels tedious with many dependencies
- Service locator pattern is familiar from Angular, NestJS, or Spring backgrounds
- Circular dependency resolution is "easier" with a container
- Frameworks make this pattern seem standard

**Consequences:**
- Hidden dependencies not visible in constructor signature
- Harder to test: need to mock or set up the container
- Violates Dependency Inversion Principle: high-level modules depend on the container
- Dependency graph is opaque; hard to reason about what constructs what
- Container initialization becomes hidden logic that must run before everything else

**Prevention:**
- Use pure constructor injection: `constructor(private emailService: EmailService) {}`
- For CLI apps, a simple factory function is sufficient and more explicit:
  ```typescript
  function createListEmailsHandler(deps: AppDependencies): ListEmailsHandler {
    return new ListEmailsHandler(deps.emailService, deps.configService, deps.logger);
  }

  type AppDependencies = {
    emailService: EmailService;
    configService: ConfigService;
    logger: Logger;
  };
  ```
- If you need a container, use `tsyringe` (minimal, no reflection) and prefer constructor injection with container registration

**Correct pattern:**
```typescript
class ListEmailsHandler {
  constructor(
    private readonly emailService: EmailService,
    private readonly outputFormatter: OutputFormatter,
    private readonly logger: Logger
  ) {}

  async handle(args: ListEmailsArgs): Promise<void> {
    this.logger.debug(`Listing emails in ${args.folder}`);
    const emails = await this.emailService.list(args);
    await this.outputFormatter.format(emails);
  }
}
```

**Warning signs:** `import { container } from '~/di/container'` inside service files; `this.container.resolve()` calls; `@injectable()` decorators throughout the codebase

---

### Pitfall 4: Over-Engineering the Architecture

**What goes wrong:** Creating 15 layers, elaborate CQRS patterns, event buses, and use case classes for a CLI that lists inbox, reads email, and sends replies.

**Why it happens:**
- "Enterprise" patterns feel like professional architecture
- Tutorial culture teaches patterns in isolation without cost-benefit analysis
- Fear of doing it wrong leads to gold-plating "to be safe"
- Confusing "lines of code" with "complexity"

**Consequences:**
- Simple operations require traversing 5 directories and 3 interfaces
- New contributors spend more time understanding the architecture than the domain
- Refactoring took so long motivation is lost before delivering user value
- Architecture overhead exceeds value for a 2,500-line CLI
- Changes that should take an hour take a day due to indirection

**Prevention:**
- Clean Architecture for CLI can be 3 layers: Commands/Handlers (application), Domain (entities/services), Infrastructure (API clients, storage)
- Start with 2 layers: Application + Infrastructure. Promote to 3 only when domain logic grows complex
- If a pattern adds indirection without clear benefit, don't use it
- CLI apps have linear flow (parse args -> fetch data -> output); they are not web APIs with multiple clients, HTTP concerns, or event-driven workflows
- Use the "n+1 rule": if you'll only ever have one implementation, don't create an interface yet

**Appropriate structure for mail-cli:**
```
src/
  commands/           # Commander command definitions + handlers (thin, framework)
  domain/             # Entities, value objects, domain services (pure business logic)
  infrastructure/     # GmailClient, GraphClient, FileTokenStore, OAuthHandler
  application/        # Use cases / handlers that orchestrate domain + infra
  di/                 # Dependency wiring (minimal, explicit factory functions)
```

**Warning signs:** `*UseCase` suffix on every function; interfaces used only once; 10+ files in an `interfaces/` directory; an `events/` directory for a CLI with no event-driven workflows

---

### Pitfall 5: Preserving Existing Code Smells in New Structure

**What goes wrong:** Refactoring only moves files to new directories but keeps god classes, magic numbers, and tight coupling in place.

**Why it happens:**
- Refactoring is scoped as "moving code" not "improving code"
- Fear of breaking working functionality leads to conservatism
- Time pressure to "finish" the refactor quickly
- "We can clean this up later" never happens

**Consequences:**
- Same bugs, new location
- Technical debt relocated, not reduced
- Team believes refactoring is done but quality problems persist
- Tests still can't isolate business logic because the coupling remains

**Prevention:**
- Define "done" criteria for refactor:
  - No class over 300 lines
  - No function over 50 lines
  - No magic numbers (use named constants)
  - All business logic callable without instantiating infrastructure
- Set a rule: if you touch a file during refactor, fix at least one thing in it
- Add tests for behavior, not just coverage percentage
- Create a quality checklist and gate PRs on it:
  - [ ] No `any` types without justification
  - [ ] All domain classes have unit tests
  - [ ] No utility functions that hide business logic
  - [ ] Dependency direction follows architecture (infra -> domain is OK; domain -> infra is not)

**Warning signs:** Files moved verbatim from `src/` to `src/domain/`; no new tests written during refactor; same class names with same methods that are 400+ lines

---

## Moderate Pitfalls

Issues that cause test brittleness, maintenance burden, or degraded CLI performance.

### Pitfall 6: Testing Infrastructure Instead of Domain

**What goes wrong:** Writing integration tests that hit the real Gmail API, or mocking everything including domain logic and ending up with mock tests that don't verify real behavior.

**Why it happens:**
- Domain logic wasn't properly extracted, so tests can only test at integration level
- "Unit tests need mocks" is taken to mean "mock everything, including business rules"
- CI environment has Gmail credentials, so "why not use them?"
- Testing philosophy is unclear, leading to a mix of slow integration tests and meaningless mock tests

**Consequences:**
- Tests are slow, flaky, and require credentials
- Mock-heavy tests break whenever implementation details change
- Refactoring breaks tests even when behavior is preserved
- The refactoring goal of "testability" is not achieved

**Prevention:**
- Push logic into domain entities with no external dependencies (no API calls, no file I/O)
- Test domain logic in true unit tests with zero mocks:
  ```typescript
  test('Email.isUnread returns true when read flag is false', () => {
    const email = new EmailBuilder().withRead(false).build();
    expect(email.isUnread()).toBe(true);
  });
  ```
- Use integration tests sparingly, only for true infrastructure (token storage, OAuth flow, API batching)
- Mock only at the boundary: `GmailClient`, `TokenStore`, `ConfigLoader`
- An integration test is acceptable; a test that mocks domain objects is not testing domain logic

**Warning signs:** Mocks in unit test files; `new GmailClient()` in unit tests; `@ts-ignore` used to skip type errors in tests; test file larger than the source file it's testing

---

### Pitfall 7: Forgetting CLI UX Constraints During Refactor

**What goes wrong:** Architecture changes introduce startup latency, memory overhead, or break the stable JSON output contract.

**Why it happens:**
- DI containers can add bootstrap time
- Lazy loading patterns add complexity for marginal benefit
- "Improving" the output format for consistency breaks existing scripts
- Error handling changes add new failure modes users don't expect

**Consequences:**
- `mail-cli list --folder INBOX` takes 800ms instead of 50ms
- Existing scripts that parse JSON output break
- Error messages change format, breaking error-handling scripts
- Memory usage spikes from container and instantiation overhead

**Prevention:**
- Measure startup time before refactor; set a 200ms ceiling; verify after each PR
- Use eager registration for commonly used services (not lazy)
- Treat the JSON output schema as an immutable contract:
  - Test the output schema explicitly
  - Any schema change is a breaking change requiring major version bump
- Keep error response envelope stable: `{"ok": false, "error": "...", "code": "..."}`
- CLI apps benefit from simple, synchronous initialization where possible

**Warning signs:** `console.time` appearing in new code but no before/after metrics; output format changes "for consistency"; new runtime overhead from patterns imported from web frameworks

---

### Pitfall 8: Circular Dependencies After Layer Extraction

**What goes wrong:** `domain/Email.ts` imports `application/EmailService.ts`, which imports `domain/Email.ts`. The codebase fails to build or has mysterious import order issues.

**Why it happens:**
- Domain services reference application use cases that call them
- Entity has a repository interface defined in domain; repository implementation is in infrastructure
- TypeScript path aliases (`~/domain`) hide the actual import graph
- "Helper" utilities in domain depend on application services

**Consequences:**
- Build failures or runtime errors that are hard to trace
- Cannot extract domain as a standalone package
- Dependency graph becomes a spider web
- Hard to reason about what depends on what

**Prevention:**
- Domain layer should have zero imports from other project layers
- Use case depends on domain; infrastructure depends on domain (via interfaces defined in domain)
- Define repository interfaces in domain; implement in infrastructure
- Follow the Dependency Rule strictly: outer layers can reference inner layers, never the reverse
- Run `depcruise` or `madge` to visualize import graph; fail CI on new cycles

**Detection:**
```bash
# Use madge to detect circular dependencies
npx madge --circular src/**/*.ts
```

**Warning signs:** `// TODO: fix circular import` comments; imports inside `import()` dynamic calls to avoid static analysis; class references passed as strings for lazy resolution

---

### Pitfall 9: Error Handling Architecture as an Afterthought

**What goes wrong:** Errors bubble up as raw `Error` objects from infrastructure, API error codes become generic "Request failed" messages, and error types are inconsistent between commands.

**Why it happens:**
- Error handling is added at the end, not during architecture design
- Infrastructure errors (network timeout, API 500) are not distinguished from business errors (invalid email address, folder not found)
- Each command handler creates its own error handling

**Consequences:**
- Scripts cannot programmatically handle specific error types
- Error codes are inconsistent: `--help` returns exit code 0 in some commands, 1 in others
- "Internal error" messages hide the actual problem from users who need to debug

**Prevention:**
- Create domain-specific error types hierarchy:
  ```typescript
  // Domain errors (business logic)
  class EmailNotFoundError extends DomainError {}
  class InvalidRecipientError extends DomainError {}
  class DraftExpiredError extends DomainError {}

  // Infrastructure errors (mapped at boundary)
  class NetworkError extends InfrastructureError {}
  class RateLimitError extends InfrastructureError { retryAfter?: number; }
  class AuthenticationError extends InfrastructureError {}
  ```
- Map infrastructure errors to domain errors at the API client boundary
- Centralize error handling at CLI entry point with consistent exit codes:
  - 0: success
  - 1: usage/argument error
  - 2: server/network error (retryable)
  - 3: authentication error (re-authenticate)
- Use error codes in JSON output: `{"ok": false, "error": "...", "code": "RATE_LIMITED", "retryAfter": 60}`

---

### Pitfall 10: Command Handler God Objects

**What goes wrong:** A single `ListEmailsHandler` handles `--folder`, `--account`, `--limit`, `--format`, `--search`, `--sort`, and 10 more flags. The handler becomes a 400-line switch statement.

**Why it happens:**
- All flags go to one handler because it "lists emails"
- Parameter parsing logic mixes with business logic
- No clear separation between "parse arguments" and "execute query"

**Consequences:**
- Hard to test individual flag combinations
- Adding a new flag requires understanding the entire handler
- Business logic is buried in argument handling code

**Prevention:**
- Use a command dispatch pattern:
  ```typescript
  // Parse first, validate second, execute third
  const parsed = parseListEmailsArgs(args);        // Pure parsing, returns typed args or validation errors
  const validated = validateListEmailsArgs(parsed); // Business validation
  const result = await listEmailsHandler.execute(validated); // Only business logic
  ```
- Separate argument parsing (can be integration tested with example data) from business logic (unit testable)
- Consider if `handler` is actually a use case; if it just calls a service, it may not need to exist

---

## Minor Pitfalls

Issues that cause friction but are recoverable.

### Pitfall 11: Decorator Overuse for DI

**What goes wrong:** Using `@injectable()`, `@inject()`, `@singleton()` decorators throughout the codebase, which requires `reflect-metadata` and makes the code tightly coupled to a DI framework.

**Prevention:**
- Prefer explicit constructor injection over decorators
- If decorators are used (e.g., for singletons), keep them minimal and isolated to infrastructure registration
- Avoid `reflect-metadata` if possible; it adds startup overhead and can cause tree-shaking issues

---

### Pitfall 12: Abstractions That Mirror Implementation

**What goes wrong:** Repository interface is `interface EmailRepository { getById(id: string): Promise<Email> }` and the implementation is identical. The abstraction adds indirection without isolating change.

**Prevention:**
- abstractions should capture *essential* complexity, not duplicate implementation
- If you're writing `implements IEmailRepository` and the method body is the same as without the interface, remove the interface
- The abstraction should exist to allow swapping implementations (e.g., real API vs. mock), not just to follow a pattern

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Folder restructuring | Pitfall 5 (preserving bad patterns) | Quality gates: max file length, no god classes, named constants |
| Domain extraction | Pitfall 1 (anemic domain), Pitfall 8 (circular deps) | Domain-first: entities before services; domain has zero imports from other layers |
| Dependency injection | Pitfall 3 (DI as service locator), Pitfall 11 (decorator overuse) | Constructor injection, simple factory, no reflect-metadata |
| Provider abstraction | Pitfall 2 (premature/lopsided abstraction) | Implement Gmail fully before abstracting; abstract only what's genuinely common |
| Unit testing | Pitfall 6 (testing infra not domain) | Test domain with zero mocks; mock only at boundary |
| Output format | Pitfall 7 (breaking JSON schema) | Treat output as immutable contract; test schema explicitly |
| Error handling | Pitfall 9 (errors as afterthought) | Domain error types from day one; centralized at entry point |
| Command handlers | Pitfall 10 (handler God objects) | Parse-then-validate-then-execute pattern |

---

## Research Notes

**Confidence: MEDIUM** — WebSearch was unavailable during research session. Findings are based on established software design principles from Clean Architecture literature (Robert C. Martin), SOLID principles, and experience reports. Not verified against live community sources.

**Gaps:**
- Current community discussions on TypeScript DI patterns (2025-2026)
- Specific Bun-native patterns for dependency injection (if different from Node)
- mail-cli codebase state (not read during research; should be consulted before phase planning)

---

## Sources

> **Confidence: LOW** — Not verified via live search due to tool unavailability.

Would verify against (if accessible):
- Robert C. Martin, "Clean Architecture" (foundational text)
- Khalil Stemmler, "Clean Architecture in Node.js" (TypeScript-focused)
- Dev.to posts on Clean Architecture pitfalls
- GitHub discussions on DI patterns in TypeScript CLI tools
- Actual mail-cli codebase inspection

---

## Verification Checklist

Before treating this document as authoritative for mail-cli specifically, verify against codebase:

- [ ] Current file/folder structure of mail-cli (to understand what "restructuring" means)
- [ ] Current class/method sizes (to identify existing god classes)
- [ ] Current test coverage (to establish baseline)
- [ ] Current error handling patterns (to ensure consistency)
- [ ] Current output format (to avoid breaking it)
- [ ] Startup time baseline (to measure refactor impact)
