# Architecture Research: Clean Architecture for TypeScript CLI Email Client

**Domain:** CLI Email Client (TypeScript/Bun)
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

The current codebase has a flat structure with 700+ lines in `cli.ts` mixing CLI parsing, business logic, and data access. The refactor should introduce Clean Architecture layers with dependency injection to achieve testability while preserving the existing CLI interface unchanged. The recommended approach uses a simplified 3-layer model (Presentation / Application / Infrastructure) rather than strict Clean Architecture's 4 layers, appropriate for a CLI tool's complexity level.

## Current Architecture Analysis

### Problems Identified

| Issue | Location | Consequence |
|-------|----------|-------------|
| `cli.ts` handles account resolution, error wrapping, AND command execution | `cli.ts` lines 43-88, 226-246 | Business logic coupled to presentation |
| Providers handle auth tokens, HTTP calls, AND response parsing | `gmail-provider.ts` lines 26-48 | Data access mixed with API calls |
| Auth module directly uses `fs/promises` for token storage | `oauth.ts` lines 116-123 | Storage logic tightly coupled |
| No interfaces between layers | All files | Cannot mock for testing |
| Batch operations have duplicated error handling | `cli.ts` lines 522-542, 594-614, 662-682 | Code duplication |

### Current Data Flow (Problematic)

```
CLI Input → cli.ts (parse + resolve provider + execute) → Provider (auth + API + parse) → JSON Output
```

All three concerns (parsing, business logic, data access) happen in the same call chain within `cli.ts` and providers.

## Recommended Clean Architecture

### Layer Model

For a CLI tool, use a simplified 3-layer Clean Architecture:

| Layer | Responsibility | Contains |
|-------|---------------|----------|
| **Presentation** | CLI parsing, output formatting, error serialization | Commander commands, option handlers |
| **Application** | Business operations, orchestration, validation | Use cases, DTOs, input validators |
| **Infrastructure** | External integrations | Providers (Gmail/Outlook), storage adapters, config |

**Deliberate simplification:** Domain entities (Email, Folder) live in Infrastructure since this is a data-mapping layer, not a complex domain model. Use cases are the business logic orchestrators.

### Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ListCommand │  │ ReadCommand │  │ SendCommand │  ...    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                   │
│              ┌───────────────────────┐                      │
│              │    UseCaseExecutor    │  ← DI container      │
│              │  (receives injected   │                      │
│              │   use case + output   │                      │
│              │      presenter)        │                      │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────┼──────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              EmailUseCases (interface)               │    │
│  │  - listEmails(folder, limit): Promise<EmailListDTO>  │    │
│  │  - readEmail(id): Promise<EmailDTO>                  │    │
│  │  - sendEmail(dto): Promise<SendResultDTO>            │    │
│  │  - searchEmails(query, limit): Promise<EmailListDTO> │    │
│  │  - markAsRead/UNread(ids, flag): Promise<BatchResult>│    │
│  │  - moveToFolder(ids, folder): Promise<BatchResult>    │    │
│  │  - deleteEmails(ids): Promise<BatchResult>           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AccountUseCases (interface)             │    │
│  │  - listAccounts(): Promise<AccountDTO[]>             │    │
│  │  - addAccount(provider): Promise<AccountDTO>         │    │
│  │  - removeAccount(id): Promise<void>                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ ListEmailsUC │  │ ReadEmailUC  │  │ SendEmailUC  │ ...   │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                 EmailProvider (interface)              │    │
│  │  - list(folder, limit): Promise<Email[]>             │    │
│  │  - read(id): Promise<Email>                           │    │
│  │  - send(dto): Promise<string>                         │    │
│  │  - ...                                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                   │
│         ┌─────────────────┴─────────────────┐                │
│         ▼                                   ▼                │
│  ┌──────────────┐                  ┌──────────────┐          │
│  │GmailProvider │                  │OutlookProvider│         │
│  └──────────────┘                  └──────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              TokenStorage (interface)                  │    │
│  │  - save(email, tokens): Promise<void>                  │    │
│  │  - get(email): Promise<Tokens | null>                  │    │
│  │  - delete(email): Promise<void>                        │    │
│  │  - list(): Promise<string[]>                           │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                   │
│                           ▼                                   │
│              ┌──────────────────────┐                        │
│              │ JsonFileTokenStorage │ (current impl)         │
│              └──────────────────────┘                        │
│                           │                                   │
│              ┌──────────────────────┐                        │
│              │  ConfigStorage      │                        │
│              │  (interface)        │                        │
│              └──────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### Key Interfaces (Ports)

**Infrastructure to Application (driven by):**

```typescript
// In src/application/ports/email-provider.port.ts
export interface EmailProviderPort {
  readonly account: string;
  readonly provider: "gmail" | "outlook";

  list(folder: string, limit: number): Promise<EmailListResult>;
  read(id: string): Promise<Email>;
  readThread(threadId: string): Promise<Email[]>;
  search(query: string, limit: number): Promise<Email[]>;
  send(dto: SendEmailDTO): Promise<string>;
  reply(id: string, dto: SendEmailDTO): Promise<string>;
  mark(id: string, read: boolean): Promise<void>;
  move(id: string, folder: string): Promise<void>;
  delete(id: string): Promise<void>;
  status(): Promise<MailboxStatus>;
  listFolders(): Promise<Folder[]>;
}

// In src/application/ports/token-storage.port.ts
export interface TokenStoragePort {
  save(email: string, tokens: OAuthTokens): Promise<void>;
  get(email: string): Promise<OAuthTokens | null>;
  delete(email: string): Promise<void>;
  list(): Promise<string[]>;
}

// In src/application/ports/config.port.ts
export interface ConfigPort {
  load(): Promise<Config>;
}
```

**Application to Presentation (driven by):**

```typescript
// In src/application/ports/use-case-executor.port.ts
export interface UseCaseExecutor {
  execute<TInput, TOutput>(
    useCase: EmailUseCase<TInput, TOutput>,
    input: TInput
  ): Promise<TOutput>;
}

export interface OutputPort<T> {
  success(data: T): void;
  error(error: AppError): never;
}
```

### Dependency Injection Strategy

Use constructor injection with a simple DI container:

```typescript
// In src/infrastructure/di/container.ts
export class Container {
  private providers = new Map<string, EmailProviderPort>();
  private tokenStorage: TokenStoragePort;
  private config: ConfigPort;

  constructor() {
    // Infrastructure setup
    this.config = new JsonFileConfigStorage();
    this.tokenStorage = new JsonFileTokenStorage();
  }

  getProvider(accountId: string): EmailProviderPort {
    if (!this.providers.has(accountId)) {
      const provider = createProviderFromAccount(accountId, this.tokenStorage);
      this.providers.set(accountId, provider);
    }
    return this.providers.get(accountId)!;
  }

  getTokenStorage(): TokenStoragePort {
    return this.tokenStorage;
  }

  getConfig(): ConfigPort {
    return this.config;
  }

  // Use case factory
  createListEmailsUseCase(): ListEmailsUseCase {
    return new ListEmailsUseCase(
      (accountId) => this.getProvider(accountId)
    );
  }
}
```

### Proposed Folder Structure

```
src/
├── main.ts                          # Entry point
├── presentation/                   # CLI LAYER
│   ├── cli.ts                      # Commander setup (thin)
│   ├── commands/                   # One file per command
│   │   ├── list-command.ts
│   │   ├── read-command.ts
│   │   ├── send-command.ts
│   │   ├── search-command.ts
│   │   ├── mark-command.ts
│   │   ├── move-command.ts
│   │   ├── delete-command.ts
│   │   ├── status-command.ts
│   │   ├── folders-command.ts
│   │   └── account/
│   │       ├── index.ts
│   │       ├── add-command.ts
│   │       ├── list-command.ts
│   │       └── remove-command.ts
│   └── shared/
│       ├── account-resolver.ts     # Resolves provider from account flag
│       └── output.ts               # JSON output formatting
│
├── application/                    # APPLICATION LAYER
│   ├── ports/                      # Interface definitions
│   │   ├── email-provider.port.ts
│   │   ├── token-storage.port.ts
│   │   └── config.port.ts
│   │
│   ├── email/
│   │   ├── list-emails.usecase.ts
│   │   ├── read-email.usecase.ts
│   │   ├── read-thread.usecase.ts
│   │   ├── search-emails.usecase.ts
│   │   ├── send-email.usecase.ts
│   │   ├── reply.usecase.ts
│   │   ├── mark.usecase.ts
│   │   ├── move.usecase.ts
│   │   ├── delete.usecase.ts
│   │   ├── status.usecase.ts
│   │   └── folders.usecase.ts
│   │
│   ├── account/
│   │   ├── add-account.usecase.ts
│   │   ├── list-accounts.usecase.ts
│   │   └── remove-account.usecase.ts
│   │
│   └── dto/                        # Data Transfer Objects
│       ├── email.dto.ts
│       ├── send-email.dto.ts
│       ├── batch-result.dto.ts
│       └── account.dto.ts
│
├── infrastructure/                 # INFRASTRUCTURE LAYER
│   ├── di/
│   │   └── container.ts           # DI container
│   │
│   ├── providers/
│   │   ├── email-provider.ts      # Abstract base class
│   │   ├── gmail-provider.ts      # Gmail implementation
│   │   └── outlook-provider.ts   # Outlook implementation
│   │
│   ├── auth/
│   │   ├── google-auth.ts
│   │   └── outlook-auth.ts
│   │
│   ├── storage/
│   │   ├── token-storage.ts       # Interface
│   │   └── json-file-token-storage.ts
│   │
│   ├── config/
│   │   ├── config-storage.ts      # Interface
│   │   └── json-file-config-storage.ts
│   │
│   └── email/
│       ├── composer.ts            # MIME building
│       └── parser.ts              # Email parsing
│
└── domain/                         # (Minimal for CLI)
    └── types/
        ├── email.ts               # Email, Attachment, Folder types
        └── errors.ts              # AppError base class
```

## Build Order (Dependency-Aware)

| Order | Component | Reason |
|-------|-----------|--------|
| 1 | `domain/types` | No dependencies, pure types |
| 2 | `domain/errors` | Depends only on types |
| 3 | `application/ports` | Depends on domain types |
| 4 | `application/dto` | Depends on domain types |
| 5 | `infrastructure/storage` (interfaces + JSON impl) | Config and token storage |
| 6 | `infrastructure/auth` | Depends on storage |
| 7 | `infrastructure/email` (parser, composer) | No external deps |
| 8 | `infrastructure/providers` (base + implementations) | Depends on auth, email |
| 9 | `infrastructure/di/container` | Wires everything |
| 10 | `application/email/use-cases` | Depends on ports |
| 11 | `application/account/use-cases` | Depends on ports |
| 12 | `presentation/commands` (shared) | Depends on use cases |
| 13 | `presentation/commands/*` | Individual commands |
| 14 | `presentation/cli.ts` | Wires commands together |
| 15 | `main.ts` | Entry point |

## Integration Points

### New vs Modified Components

| Component | Action | Notes |
|-----------|--------|-------|
| `domain/types/email.ts` | **NEW** | Extract Email, Attachment, Folder interfaces from `providers/email-provider.ts` |
| `domain/errors.ts` | **NEW** | Base `AppError` class, extracted from `utils/errors.ts` |
| `application/ports/*` | **NEW** | All interface definitions |
| `application/dto/*` | **NEW** | DTOs for use case inputs/outputs |
| `application/email/*.usecase.ts` | **NEW** | Use case implementations |
| `infrastructure/providers/*` | **MODIFY** | Implement `EmailProviderPort` interface |
| `infrastructure/storage/*` | **NEW** | `TokenStoragePort` implementation |
| `infrastructure/config/*` | **NEW** | `ConfigPort` implementation |
| `infrastructure/di/container.ts` | **NEW** | DI container wiring providers to use cases |
| `presentation/commands/*.ts` | **NEW** | Refactored command handlers (thin) |
| `cli.ts` | **MODIFY** | Commander setup only, move all logic to use cases |
| `src/auth/*` | **MODIFY** | Refactor into auth infrastructure |
| `src/utils/errors.ts` | **DELETE** | Merged into `domain/errors.ts` |

### Preserved Components (Minimal Change)

| Component | Change | Rationale |
|-----------|--------|-----------|
| `src/email/composer.ts` | Move to `infrastructure/email/` | No logic changes needed |
| `src/email/parser.ts` | Move to `infrastructure/email/` | No logic changes needed |
| `src/providers/email-provider.ts` | **DELETE** after interface extraction | Replaced by `application/ports/email-provider.port.ts` |
| `src/providers/gmail-provider.ts` | Implement new interface | Change import path, implement port |
| `src/providers/outlook-provider.ts` | Implement new interface | Change import path, implement port |

## Testing Strategy

With proper DI, each layer becomes testable in isolation:

| Test Type | Target | Mock Dependencies |
|-----------|--------|-------------------|
| Unit | Use Cases | `EmailProviderPort`, `TokenStoragePort` (mocked) |
| Unit | Command Handlers | Use cases (mocked) |
| Integration | Providers | Real API calls (or recorded fixtures) |
| Integration | Storage | Real filesystem |

```typescript
// Example: Testing SendEmailUseCase
class MockEmailProviderPort implements EmailProviderPort {
  sentEmails: SendEmailDTO[] = [];
  sendResult = "msg-123";

  async send(dto: SendEmailDTO): Promise<string> {
    this.sentEmails.push(dto);
    return this.sendResult;
  }
  // ... implement all interface methods
}

test("SendEmailUseCase calls provider.send with correct DTO", async () => {
  const mockProvider = new MockEmailProviderPort();
  const useCase = new SendEmailUseCase(() => mockProvider);

  await useCase.execute({
    to: ["test@example.com"],
    subject: "Test",
    body: "Hello",
  });

  expect(mockProvider.sentEmails).toHaveLength(1);
  expect(mockProvider.sentEmails[0].to).toEqual(["test@example.com"]);
});
```

## Data Flow Changes

### Current (Monolithic)

```
CLI arg parsing → cli.ts (resolve provider + call) → provider (auth + API call + parse) → JSON
```

### Target (Layered)

```
CLI arg parsing → Command Handler → Use Case → Provider → API → JSON
                        ↓               ↓
                   (thin, minimal) (business logic,
                                   validation)
```

### Critical Changes for Refactor

1. **`resolveProvider()`** moves from `cli.ts` to a `AccountResolver` in presentation/shared, which uses `TokenStoragePort` to list accounts and determine provider type.

2. **Batch operations** currently duplicated in `cli.ts` (mark/move/delete each have identical error-handling loops) become a single `BatchUseCase` base class.

3. **Error wrapping** (`CLIError` creation) moves from providers to use cases, so providers throw domain-specific errors that use cases translate.

4. **Auth flow** (`getAccessToken()`) becomes an `AuthService` in infrastructure, called by use cases that need it.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fat Command Handlers

**What goes wrong:** Moving all logic into `presentation/commands/*.ts` files without extracting to use cases.
**Why:** Command handlers become a new mess, just in different files.
**Instead:** Commands should be thin wrappers that delegate to use cases.

### Anti-Pattern 2: Domain Objects in Providers

**What goes wrong:** Providers return raw API responses instead of domain types.
**Why:** Couples consumers to provider-specific schemas.
**Instead:** Providers map to domain types (Email, Folder) before returning.

### Anti-Pattern 3: Static Coupling of Providers

**What goes wrong:** `GmailProvider` directly imports `refreshAccessToken` from auth module.
**Why:** Cannot swap implementations or mock for testing.
**Instead:** Inject auth as a dependency via constructor.

## Sources

- [Clean Architecture Patterns - Robert C. Martin](https://blog.cleancoder.com) — Foundational patterns
- [Commander.js Best Practices](https://github.com/tj/commander.js) — CLI patterns (verified via source)
- Current codebase analysis — Verified via source reading

---

*Architecture research for: mail-cli v1.1 Architecture Refactor*
*Researched: 2026-04-05*
