# Feature Research: Architecture Refactor

**Domain:** mail-cli v1.1 Architecture Refactor
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH
**Focus:** Testing, Dependency Injection, Clean Architecture patterns for CLI refactor

## Executive Summary

This refactor is NOT about adding email features -- it is about restructuring the existing codebase for maintainability, modularity, and testability. The target features are architectural patterns: testing infrastructure, dependency injection, and Clean Architecture layer separation. Existing CLI behavior must remain unchanged.

## Feature Categories for Refactor

### 1. Testing Infrastructure

#### 1.1 Test Runner (bun:test)

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| `bun:test` | Built-in Jest-compatible test runner | LOW | Already available via `@types/bun`. Use `import { test, expect, mock, spyOn } from 'bun:test'` |
| Coverage reporting | `--coverage` flag with text/lcov output | LOW | Configure via bunfig.toml |
| JUnit XML output | `--reporter=junit --reporter-outfile` for CI | LOW | GitLab, Jenkins compatibility |

**bun:test API (relevant for CLI testing):**

| API | Usage | Example |
|-----|-------|---------|
| `mock(fn)` | Create mock function | `const fn = mock(() => 42)` |
| `jest.fn()` | Jest-compatible alternative | `const fn = jest.fn(() => 42)` |
| `mock.mockResolvedValue(v)` | Async mock resolve | `fn.mockResolvedValue({ id: '1' })` |
| `mock.mockRejectedValue(e)` | Async mock reject | `fn.mockRejectedValue(new Error('fail'))` |
| `spyOn(obj, 'method')` | Spy without replacing | `spyOn(console, 'log')` |
| `mock.module(path, fn)` | Module-level mock | `mock.module('./provider', () => ({ ... }))` |
| `mock.restore()` | Restore mocked implementation | `fn.mock.restore()` |
| `mock.clearAllMocks()` | Reset call history | Clears `.calls`, `.results` |

**CLI-specific test patterns:**

```typescript
// Test file: src/application/email/list-emails.usecase.test.ts
import { test, expect, mock } from 'bun:test';
import { ListEmailsUseCase } from './list-emails.usecase';

// Factory pattern for dependency injection
function createMockEmailProvider() {
  return {
    list: mock(async () => ({
      emails: [
        { id: '1', from: 'a@b.com', subject: 'Test', date: '2026-01-01', to: [] },
      ],
    })),
  };
}

test('ListEmailsUseCase returns email list', async () => {
  const mockProvider = createMockEmailProvider();
  const useCase = new ListEmailsUseCase(() => mockProvider);

  const result = await useCase.execute({ folder: 'INBOX', limit: 20 });

  expect(result.emails).toHaveLength(1);
  expect(mockProvider.list).toHaveBeenCalledWith('INBOX', 20);
});
```

#### 1.2 CLI Command Testing Patterns

| Pattern | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Integration test | Test full command execution | MEDIUM | Parse args, execute, verify output |
| Unit test | Test use case in isolation | LOW | Mock provider ports |
| Output capture | Verify JSON output format | LOW | Use `bun:test` with subprocess |

**Testing command handlers (thin wrapper pattern):**

```typescript
// Test file: src/presentation/commands/list-command.test.ts
import { test, expect, mock } from 'bun:test';
import { executeListCommand } from './list-command';

// Mock the use case
mock.module('../application/email/list-emails.usecase', () => ({
  ListEmailsUseCase: class {
    execute = mock(async () => ({ emails: [], nextPageToken: undefined }));
  },
}));

test('list command outputs JSON', async () => {
  // Capture console.log output
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await executeListCommand({ folder: 'INBOX', limit: 10 });
    const output = JSON.parse(logs[0]);
    expect(output).toHaveProperty('emails');
  } finally {
    console.log = originalLog;
  }
});
```

#### 1.3 Test File Organization

```
src/
├── application/
│   ├── email/
│   │   ├── list-emails.usecase.ts
│   │   └── list-emails.usecase.test.ts   # Co-located tests
│   └── dto/
│       └── email.dto.ts
│
├── infrastructure/
│   ├── providers/
│   │   ├── gmail-provider.ts
│   │   └── gmail-provider.test.ts         # Integration tests (real API or fixtures)
│   │
│   └── storage/
│       └── json-file-token-storage.ts
│
└── presentation/
    └── commands/
        ├── list-command.ts
        └── list-command.test.ts
```

**Test naming conventions:**
- `*.test.ts` for unit/integration tests
- `*.test-d.ts` for type testing (if using `expectTypeOf`)
- Pattern: co-locate test with source (`list-emails.usecase.ts` + `list-emails.usecase.test.ts`)

#### 1.4 bunfig.toml Configuration

```toml
[test]
retry = 3              # Retry flaky tests
timeout = 10000        # Per-test timeout in ms
preload = ["./test/setup.ts"]  # Preload mocks before tests

[test.coverage]
coverage = true
coverageReporter = ["text", "lcov"]
```

---

### 2. Dependency Injection

#### 2.1 DI Approaches Comparison

| Approach | Library | Complexity | Best For | Notes |
|----------|---------|------------|----------|-------|
| **Manual DI with factories** | None | LOW | CLI apps, simple graphs | Recommended for this project |
| Constructor injection | None | LOW | All cases | Primary pattern |
| TSyringe | `tsyringe` | MEDIUM | When container features needed | Requires `reflect-metadata` |
| InversifyJS | `inversify` | HIGH | Complex DI graphs | Overkill for CLI |

**Recommendation: Manual DI with factory functions**

Rationale:
- CLI apps have linear dependency graphs, not complex object graphs
- No additional runtime dependencies
- Explicit wiring is easier to debug
- Constructor injection covers 90% of testability needs

#### 2.2 Manual DI Pattern

**Pattern: Constructor injection with factory**

```typescript
// Interface (port)
export interface IEmailProviderPort {
  list(folder: string, limit: number): Promise<{ emails: Email[]; nextPageToken?: string }>;
  read(id: string): Promise<Email>;
  send(dto: SendEmailDTO): Promise<string>;
  // ...
}

// Implementation (infrastructure)
export class GmailProvider implements IEmailProviderPort {
  // ... existing implementation
}

// Factory function
export function createGmailProvider(account: string, tokenStorage: ITokenStoragePort): IEmailProviderPort {
  return new GmailProvider(account, tokenStorage);
}

// Use case (application layer)
export class ListEmailsUseCase {
  constructor(
    private getProvider: (accountId: string) => IEmailProviderPort
  ) {}

  async execute(input: ListEmailsInput): Promise<EmailListDTO> {
    const provider = this.getProvider(input.accountId);
    const result = await provider.list(input.folder, input.limit);
    return { emails: result.emails, nextPageToken: result.nextPageToken };
  }
}
```

**Usage:**

```typescript
// Production (wire in main.ts or container)
const tokenStorage = new JsonFileTokenStorage();
const container = new Container(tokenStorage);

const listEmailsUseCase = new ListEmailsUseCase(
  (accountId) => container.getProvider(accountId)
);

// Test (inject mocks)
const mockProvider = createMockEmailProvider();
const listEmailsUseCase = new ListEmailsUseCase(
  () => mockProvider  // Always returns mock
);
```

#### 2.3 DI Container (Optional -- Start Without)

**If a container is needed later, build a simple one:**

```typescript
// src/infrastructure/di/container.ts
export class Container {
  private providers = new Map<string, IEmailProviderPort>();

  constructor(
    private tokenStorage: ITokenStoragePort,
    private config: IConfigPort,
  ) {}

  getProvider(accountId: string): IEmailProviderPort {
    if (!this.providers.has(accountId)) {
      const account = this.parseAccountId(accountId);
      if (account.provider === 'gmail') {
        this.providers.set(accountId, new GmailProvider(account.email, this.tokenStorage));
      } else {
        this.providers.set(accountId, new OutlookProvider(account.email, this.tokenStorage));
      }
    }
    return this.providers.get(accountId)!;
  }

  // Use case factories
  createListEmailsUseCase(): ListEmailsUseCase {
    return new ListEmailsUseCase((accountId) => this.getProvider(accountId));
  }
}
```

**Do NOT add this initially.** Start with direct factory functions. Add container only when:
- Number of use cases grows beyond 10
- Need for singleton scoping emerges
- Provider caching becomes necessary

#### 2.4 When NOT to Use DI

| Scenario | Approach | Why |
|----------|----------|-----|
| Pure functions | No DI needed | No side effects, no dependencies |
| Configuration only | Pass as constructor param | Simple enough to not need abstraction |
| Single implementation | Direct instantiation | YAGNI until interface needed |

---

### 3. Clean Architecture Layers

#### 3.1 Layer Definitions

| Layer | Responsibility | Contents | Dependency Direction |
|-------|---------------|----------|---------------------|
| **Presentation** | CLI parsing, output formatting | Commander commands, option handlers, account resolver | Depends on Application |
| **Application** | Business logic, orchestration, validation | Use cases, DTOs, input validators, ports (interfaces) | Depends on Infrastructure |
| **Infrastructure** | External integrations | Providers (Gmail/Outlook), storage adapters, config, auth | No internal dependencies |
| **Domain** | Types and errors | Email, Folder, Attachment types, AppError base | No dependencies |

**Deliberate simplification for CLI:**
- Domain entities (Email, Folder) live in Infrastructure, not a separate layer -- this is a data-mapping layer, not complex domain modeling
- Use cases are thin orchestrators, not rich domain logic
- This 3-layer (Presentation/Application/Infrastructure) model fits CLI complexity

#### 3.2 Layer Boundaries

```
PRESENTATION LAYER (src/presentation/)
    │
    │  Depends on use case interfaces
    ▼
APPLICATION LAYER (src/application/)
    │
    │  Depends on port interfaces
    ▼
INFRASTRUCTURE LAYER (src/infrastructure/)
    │
    │  Implements port interfaces
    ▼
    External: Gmail API, Microsoft Graph API, filesystem
```

**Key rule:** Dependencies point inward. Inner layers know nothing about outer layers.

#### 3.3 Port Interfaces (Application Layer)

**Driven by (Infrastructure -> Application):**

```typescript
// src/application/ports/email-provider.port.ts
export interface IEmailProviderPort {
  readonly account: string;
  readonly provider: 'gmail' | 'outlook';

  list(folder: string, limit: number): Promise<{ emails: Email[]; nextPageToken?: string }>;
  read(id: string): Promise<Email>;
  readThread(threadId: string): Promise<Email[]>;
  search(query: string, limit: number): Promise<Email[]>;
  send(dto: SendEmailDTO): Promise<string>;
  reply(id: string, dto: SendEmailDTO): Promise<string>;
  mark(id: string, read: boolean): Promise<void>;
  move(id: string, folder: string): Promise<void>;
  delete(id: string): Promise<void>;
  status(): Promise<{ unread: number; total: number }>;
  listFolders(): Promise<Folder[]>;
}

// src/application/ports/token-storage.port.ts
export interface ITokenStoragePort {
  save(email: string, tokens: OAuthTokens): Promise<void>;
  get(email: string): Promise<OAuthTokens | null>;
  delete(email: string): Promise<void>;
  list(): Promise<string[]>;
}

// src/application/ports/config.port.ts
export interface IConfigPort {
  load(): Promise<AppConfig>;
}
```

**Driving (Application -> Presentation):**

```typescript
// src/application/ports/use-case-executor.port.ts
export interface IOutputPort<T> {
  success(data: T): void;
  error(error: AppError): never;
}

export interface IUseCaseExecutor {
  execute<TInput, TOutput>(
    useCase: IUseCase<TInput, TOutput>,
    input: TInput,
    outputPort: IOutputPort<TOutput>
  ): Promise<void>;
}
```

#### 3.4 Use Case Structure

```typescript
// src/application/email/list-emails.usecase.ts

// Input DTO
export interface ListEmailsInput {
  accountId: string;
  folder: string;
  limit: number;
}

// Output DTO
export interface EmailListDTO {
  emails: EmailSummaryDTO[];
  nextPageToken?: string;
}

// Use case interface (port)
export interface IListEmailsUseCase {
  execute(input: ListEmailsInput): Promise<EmailListDTO>;
}

// Use case implementation
export class ListEmailsUseCase implements IListEmailsUseCase {
  constructor(
    private getProvider: (accountId: string) => IEmailProviderPort
  ) {}

  async execute(input: ListEmailsInput): Promise<EmailListDTO> {
    // Validation
    if (input.limit < 1 || input.limit > 100) {
      throw new AppError('INVALID_LIMIT', 'Limit must be between 1 and 100');
    }

    // Business logic
    const result = await this.getProvider(input.accountId).list(input.folder, input.limit);

    // Map to DTO
    return {
      emails: result.emails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        flags: email.flags,
      })),
      nextPageToken: result.nextPageToken,
    };
  }
}
```

#### 3.5 Command Handler Pattern (Presentation)

**Thin wrapper that delegates to use case:**

```typescript
// src/presentation/commands/list-command.ts
import type { IListEmailsUseCase } from '../../application/email/list-emails.usecase';
import type { ListEmailsInput } from '../../application/email/list-emails.usecase';

export function createListCommandHandler(
  listEmailsUseCase: IListEmailsUseCase,
  resolveAccount: () => Promise<string>
) {
  return async function handleListCommand(options: {
    account?: string;
    folder: string;
    limit: number;
  }): Promise<void> {
    const accountId = options.account ?? await resolveAccount();

    const input: ListEmailsInput = {
      accountId,
      folder: options.folder,
      limit: options.limit,
    };

    const result = await listEmailsUseCase.execute(input);
    console.log(JSON.stringify(result));
  };
}
```

**Anti-pattern to avoid: Fat command handlers** -- do NOT put business logic in command handlers.

#### 3.6 Batch Operation Base Class

**Current problem:** mark/move/delete have duplicated error handling loops in cli.ts.

**Solution:** Extract base class in application layer:

```typescript
// src/application/email/batch.usecase.ts
export abstract class BatchUseCase<TInput, TItem> {
  abstract getItemIds(input: TInput): string[];
  abstract executeItem(itemId: string): Promise<void>;

  async execute(input: TInput): Promise<BatchResultDTO> {
    const itemIds = this.getItemIds(input);
    const failed: FailedItemDTO[] = [];

    for (const itemId of itemIds) {
      try {
        await this.executeItem(itemId);
      } catch (error) {
        failed.push({
          id: itemId,
          error: {
            code: error instanceof AppError ? error.code : 'UNKNOWN',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return { ok: failed.length === 0, failed };
  }
}
```

```typescript
// Mark emails use case extends BatchUseCase
export class MarkEmailsUseCase extends BatchUseCase<MarkEmailsInput, string> {
  constructor(private getProvider: (accountId: string) => IEmailProviderPort) {
    super();
  }

  getItemIds(input: MarkEmailsInput): string[] {
    return input.ids;
  }

  async executeItem(id: string): Promise<void> {
    // Provider-specific implementation
  }
}
```

---

### 4. Proposed Folder Structure

```
src/
├── main.ts                           # Entry point (currently cli.ts -> renamed)

├── domain/                           # DOMAIN LAYER (no dependencies)
│   └── types/
│       ├── email.ts                  # Email, Attachment, Folder interfaces
│       └── errors.ts                 # AppError base class

├── application/                      # APPLICATION LAYER (depends on domain + ports)
│   ├── ports/                        # Interface definitions (inward dependencies only)
│   │   ├── email-provider.port.ts
│   │   ├── token-storage.port.ts
│   │   ├── config.port.ts
│   │   └── use-case.port.ts
│   │
│   ├── dto/                          # Data Transfer Objects
│   │   ├── email.dto.ts
│   │   ├── send-email.dto.ts
│   │   ├── batch-result.dto.ts
│   │   └── account.dto.ts
│   │
│   ├── email/                        # Email use cases
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
│   │   ├── folders.usecase.ts
│   │   └── batch.usecase.ts
│   │
│   └── account/                      # Account use cases
│       ├── add-account.usecase.ts
│       ├── list-accounts.usecase.ts
│       └── remove-account.usecase.ts

├── infrastructure/                    # INFRASTRUCTURE LAYER (implements ports)
│   ├── di/
│   │   └── container.ts             # Optional DI container
│   │
│   ├── providers/                    # Email provider implementations
│   │   ├── email-provider.base.ts   # Abstract base (shared logic)
│   │   ├── gmail-provider.ts
│   │   └── outlook-provider.ts
│   │
│   ├── auth/                         # OAuth implementations
│   │   ├── google-auth.ts
│   │   └── outlook-auth.ts
│   │
│   ├── storage/                      # Storage implementations
│   │   ├── token-storage.ts         # Interface
│   │   └── json-file-token-storage.ts
│   │
│   ├── config/                       # Config implementations
│   │   ├── config-storage.ts        # Interface
│   │   └── json-file-config-storage.ts
│   │
│   └── email/                        # Email utilities (existing code)
│       ├── composer.ts
│       └── parser.ts

└── presentation/                     # PRESENTATION LAYER (depends on application)
    ├── cli.ts                        # Commander setup (thin)
    ├── shared/
    │   ├── account-resolver.ts       # Resolves provider from account flag
    │   └── output.ts                 # JSON output formatting
    └── commands/                     # One file per command (thin wrappers)
        ├── list-command.ts
        ├── read-command.ts
        ├── send-command.ts
        ├── search-command.ts
        ├── mark-command.ts
        ├── move-command.ts
        ├── delete-command.ts
        ├── status-command.ts
        ├── folders-command.ts
        └── account/
            ├── index.ts
            ├── add-command.ts
            ├── list-command.ts
            └── remove-command.ts
```

---

### 5. Feature Complexity by Component

| Component | Complexity | Reason |
|-----------|------------|--------|
| Move domain types to `domain/` | LOW | Extract existing types, no new logic |
| Create `application/ports/` interfaces | LOW | Define interfaces matching existing EmailProvider |
| Refactor providers to implement ports | MEDIUM | Change imports, add interface implementation |
| Create use cases | MEDIUM | Extract business logic from cli.ts and providers |
| Create DI container | MEDIUM | Only if needed (start without) |
| Thin command handlers | LOW | Delegate to use cases, minimal logic |
| Batch base class | MEDIUM | Eliminate code duplication |
| Write unit tests | MEDIUM | Mock dependencies, test use cases |
| Write integration tests | HIGH | Provider tests need fixtures or real API |

---

### 6. Dependencies Between Components

```
Build Order (dependency-aware):

1. domain/types        -> No dependencies (pure types)
2. domain/errors       -> Depends on domain/types
3. application/ports   -> Depends on domain/types
4. application/dto     -> Depends on domain/types
5. infrastructure/storage (interfaces + JSON impl) -> Depends on domain/types
6. infrastructure/auth -> Depends on storage
7. infrastructure/email (parser, composer) -> No external deps
8. infrastructure/providers (base + Gmail + Outlook) -> Depends on auth, email
9. infrastructure/di/container -> Wires providers (optional, build last)
10. application/email/use-cases -> Depends on ports
11. application/account/use-cases -> Depends on ports
12. presentation/shared -> Depends on use cases
13. presentation/commands/* -> Thin wrappers, minimal deps
14. presentation/cli.ts -> Wires commands
15. main.ts -> Entry point
```

---

### 7. What NOT to Build (Anti-Features for Refactor)

| Avoid | Why | Use Instead |
|-------|-----|------------|
| Full Clean Architecture with 4+ layers | CLI complexity does not warrant it | 3-layer model (Presentation/Application/Infrastructure) |
| tsyringe or inversify DI container | Adds complexity without value for CLI | Manual DI with factory functions |
| Mock `__mocks__` directories | bun:test does not support this | `mock.module()` with `--preload` |
| jest or vitest | bun:test is built-in and Jest-compatible | bun:test |
| Domain-driven design patterns | This is a data-mapping layer, not complex domain | Simple type definitions + use cases |
| Event-driven architecture | Overkill for CLI | Direct use case invocation |
| CQRS | Not needed for this complexity | Simple command/query separation |

---

## Sources

- [Bun Test Documentation](https://bun.sh/docs/test) (HIGH - official docs, 2026)
- [Bun Test Mocks](https://bun.sh/docs/test/mocks) (HIGH - official docs, 2026)
- [TSyringe GitHub](https://github.com/microsoft/tsyringe) (MEDIUM - WebFetch)
- [InversifyJS GitHub](https://github.com/inversify/InversifyJS) (MEDIUM - WebFetch)
- Existing codebase analysis (verified - current project state)
- [STACK.md](STACK.md) (HIGH - current project research)
- [ARCHITECTURE.md](ARCHITECTURE.md) (HIGH - current project research)

---

*Feature research for: mail-cli v1.1 Architecture Refactor*
*Researched: 2026-04-05*
