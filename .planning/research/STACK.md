# Technology Stack: Architecture Refactor

**Project:** mail-cli v1.1 Architecture Refactor
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

## Context

This is a refactor-focused stack analysis. The existing production dependencies (googleapis, @microsoft/microsoft-graph-client, commander, ora, picocolors) remain unchanged. This document covers ONLY what is needed for:
- Clean Architecture refactoring
- Dependency injection
- Unit testing
- CI/CD pipeline
- Linting enforcement

## Recommended Stack for Refactor

### Core Technologies (No Changes Needed)

| Technology | Current Version | Status | Notes |
|------------|-----------------|--------|-------|
| Bun | 1.x | Already using | Required per CLAUDE.md |
| TypeScript | ^6.0.2 | Already using | Strict mode already configured |
| Biome | 2.4.10 | Already using | Handles linting + formatting |
| tsup | 8.5.1 | Already using | Build tool already configured |

### Dependency Injection

| Option | Recommendation | Version | Rationale |
|--------|----------------|---------|-----------|
| Manual DI with factory functions | **Recommended** | N/A (no library) | No additional dependency. Sufficient for CLI app complexity. |
| TSyringe | Alternative if container needed | ^4.x | Lightweight container. Requires `reflect-metadata`. Adds runtime overhead. |

**Why Manual DI is recommended for this project:**
- CLI apps have linear dependency graphs, not complex object graphs
- Constructor injection with factory functions covers 90% of testability needs
- No reflect-metadata polyfill needed
- Easier to debug (explicit wiring)
- Project already simplified by removing keytar (see Phase 6 decision to use plain JSON)

**Manual DI Pattern:**

```typescript
// src/services/interfaces.ts
export interface IGmailClient {
  getMessages(userId: string, query: string): Promise<GmailMessage[]>;
  sendMessage(userId: string, email: RawEmail): Promise<GmailSentMessage>;
}

export interface IOutlookClient {
  getMessages(query: string): Promise<OutlookMessage[]>;
  sendMessage(email: RawEmail): Promise<OutlookSentMessage>;
}

export interface IEmailService {
  getInbox(accountId: string): Promise<Email[]>;
  send(accountId: string, email: Draft): Promise<SentEmail>;
}

// src/services/email-service.ts
export function createEmailService(
  gmailClient: IGmailClient,
  outlookClient: IOutlookClient,
  configStore: IConfigStore
): IEmailService {
  return new EmailService(gmailClient, outlookClient, configStore);
}

// Usage in production (wire in main/index.ts)
const gmailClient = createGmailClient(oauth2Client);
const outlookClient = createOutlookClient(msalClient);
const emailService = createEmailService(gmailClient, outlookClient, configStore);

// Usage in tests (inject mocks)
const mockGmailClient = { getMessages: mock(async () => [{ id: '1', subject: 'Test' }]) };
const emailService = createEmailService(mockGmailClient, mockOutlookClient, mockConfig);
```

**If TSyringe is needed later:**
```typescript
import 'reflect-metadata';
import { injectable, inject, container } from 'tsyringe';

@injectable()
class EmailService {
  constructor(
    @inject('IGmailClient') private gmailClient: IGmailClient,
    @inject('IOutlookClient') private outlookClient: IOutlookClient
  ) {}
}
```
**Decision: Start with Manual DI. Add TSyringe only if container features (singleton scopes, disposal, interception) become necessary.**

### Unit Testing

| Component | Status | Action Needed |
|-----------|--------|---------------|
| bun:test | Built-in to Bun | No install. Use `import { test, expect, mock, spyOn } from 'bun:test'` |
| @types/bun | Already in devDependencies | Already available |
| jest / vitest | NOT needed | bun:test is Jest-compatible |

**No additional mocking libraries needed.** bun:test provides comprehensive mocking:

| Feature | bun:test API |
|---------|--------------|
| Mock functions | `mock(() => ...)` or `jest.fn(() => ...)` |
| Async mocks | `mockFn.mockResolvedValue(value)` |
| Spies | `spyOn(obj, 'method')` |
| Module mocks | `mock.module('./path', () => ({ ... }))` |
| Mock cleanup | `mock.restore()`, `mock.clearAllMocks()` |

**bunfig.toml for test configuration:**

```toml
[test]
retry = 3              # Retry flaky tests
timeout = 10000        # Per-test timeout in ms
preload = ["./test/setup.ts"]  # Preload mocks before tests

[test.coverage]
coverage = true
coverageReporter = ["text", "lcov"]
```

**Example test file:**

```typescript
// src/services/email-service.test.ts
import { test, expect, mock, spyOn } from 'bun:test';
import { createEmailService } from './email-service';

test('getInbox delegates to correct provider client', async () => {
  const mockGmail = { getMessages: mock(async () => [{ id: '1', subject: 'Gmail Test' }]) };
  const mockOutlook = { getMessages: mock(async () => []) };
  const mockConfig = {
    getAccount: mock(async () => ({ id: '1', provider: 'gmail', email: 'test@gmail.com' }))
  };

  const service = createEmailService(mockGmail, mockOutlook, mockConfig);
  const emails = await service.getInbox('account-gmail');

  expect(emails).toHaveLength(1);
  expect(mockGmail.getMessages).toHaveBeenCalledWith('account-gmail', 'in:inbox');
  expect(mockOutlook.getMessages).not.toHaveBeenCalled();
});
```

**Note:** bun:test does NOT support `__mocks__` directories. Use `mock.module()` with `--preload` instead.

### CI/CD

| Component | Recommendation | Configuration |
|-----------|----------------|---------------|
| GitHub Actions | `oven-sh/setup-bun@v2` | First-class bun support, auto annotations |
| Test reporting | JUnit XML via `--reporter=junit` | For GitLab, Jenkins, or when annotations insufficient |
| Linting check | `biome ci` | Non-interactive check mode for CI |

**GitHub Actions Workflow (`.github/workflows/ci.yml`):**

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

**For GitLab or other CI:**

```bash
# Generate JUnit XML for test results
bun test --reporter=junit --reporter-outfile=./bun.xml

# Check lint without auto-fix
bun run biome ci .
```

### Linting (No Changes Needed)

| Tool | Current Config | Status |
|------|----------------|--------|
| Biome | 2.4.10 | Already in package.json |
| biome.json | Already configured | No changes needed |

**Existing scripts in package.json:**
- `bun run lint` - `biome lint --write`
- `bun run format` - `biome format --write`

**Recommended: Add CI-specific scripts:**

```json
{
  "scripts": {
    "ci:lint": "biome ci",
    "ci:test": "bun test --coverage",
    "ci": "bun run ci:lint && bun run ci:test"
  }
}
```

## What NOT to Add for This Refactor

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| jest, vitest | bun:test is built-in, Jest-compatible | bun:test |
| @types/jest | Not needed | bun:test types included |
| sinon, jest-mock-extended | bun:test has built-in mock, spy, module mocks | bun:test APIs |
| tsyringe, inversify | Adds complexity without value for CLI DI | Manual DI with factories |
| ESLint, Prettier | Biome already handles lint + format | Biome |
| @types/eslint, @types/prettier | Not needed | N/A |

## Summary: Dependency Changes for Refactor

**New dependencies to add:** NONE

**DevDependencies to add:** NONE

The refactor only requires:
1. Adopting manual DI patterns (no library)
2. Using bun:test for all unit tests
3. Adding GitHub Actions workflow for CI
4. Possibly adding `reflect-metadata` only if TSyringe becomes necessary later

## Sources

- [Bun Test Documentation](https://bun.sh/docs/test) (HIGH - official docs, 2026)
- [Bun Test Mocks](https://bun.sh/docs/test/mocks) (HIGH - official docs, 2026)
- [Biome v2.4.10](https://github.com/biomejs/biome) (HIGH - official repo)
- [TSyringe GitHub](https://github.com/microsoft/tsyringe) (MEDIUM - WebFetch)
- [InversifyJS v7.10.0](https://github.com/inversify/InversifyJS) (MEDIUM - WebFetch)
- package.json (verified - current project state)
