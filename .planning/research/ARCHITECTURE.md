# Architecture Research

**Domain:** CLI Email Client
**Researched:** 2026-04-04
**Confidence:** MEDIUM (based on established CLI application patterns; external verification unavailable)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI Layer                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  commander  │  │   Output    │  │    Config   │         │
│  │   (parse)   │  │  (JSONfmt)  │  │  (rc file)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
├─────────┴────────────────┴────────────────┴──────────────────┤
│                    Command Handlers                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   List   │  │   Read   │  │  Search  │  │  Send    │     │
│  │  Emails  │  │  Email   │  │          │  │  Email   │     │
│  └──────┬───┘  └──────┬───┘  └──────┬───┘  └──────┬───┘     │
│         │              │              │              │        │
├─────────┴──────────────┴──────────────┴──────────────┴────────┤
│                   Provider Service Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  Gmail Provider     │    │  Outlook Provider   │         │
│  │  (googleapis)       │    │  (MS Graph)          │         │
│  └──────────┬──────────┘    └──────────┬──────────┘         │
│             │                          │                     │
├─────────────┴──────────────────────────┴─────────────────────┤
│                     Transport Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   OAuth2    │  │    HTTP      │  │  Credential │         │
│  │   Manager   │  │   Client     │  │    Store    │         │
│  │             │  │  (Bun APIs)  │  │  (keytar)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| CLI Layer (commander) | Parse flags/args, dispatch commands | `commander` package |
| Output Formatter | Transform responses to JSON arrays | Custom serializer |
| Command Handlers | Business logic per command | Functions in `src/commands/` |
| Provider Service | Unified interface over Gmail/Outlook APIs | Provider interface + implementations |
| OAuth2 Manager | Token lifecycle (get, refresh, revoke) | Custom with googleapis/auth |
| Credential Store | Secure storage of tokens per account | `keytar` (system keychain) |
| HTTP Client | Make authenticated API requests | Bun native `fetch` |

## Recommended Project Structure

```
src/
├── cli/
│   ├── index.ts           # CLI entry point, commander setup
│   ├── commands/         # Command handlers
│   │   ├── list.ts       # list emails command
│   │   ├── read.ts       # read email command
│   │   ├── search.ts     # search command
│   │   ├── send.ts       # send/compose command
│   │   ├── reply.ts      # reply command
│   │   ├── move.ts       # move/trash command
│   │   └── account.ts    # account management
│   └── output.ts         # JSON output formatting
├── providers/
│   ├── base.ts           # Provider interface/abstract class
│   ├── gmail.ts          # Gmail API implementation
│   ├── outlook.ts        # Microsoft Graph implementation
│   └── types.ts          # Unified types (Email, Folder, etc.)
├── auth/
│   ├── oauth.ts          # OAuth2 flow implementation
│   ├── tokens.ts         # Token storage/retrieval
│   └── keytar.ts         # Credential store wrapper
├── http/
│   └── client.ts         # HTTP client with retry logic
└── utils/
    ├── errors.ts         # Custom error types
    └── validation.ts     # Input validation helpers
```

### Structure Rationale

- **`cli/`:** Isolates command-line concerns from business logic. Easy to test handlers in isolation.
- **`providers/`:** Centralizes API differences behind a common interface. Adding a new provider = new file, no changes to commands.
- **`auth/`:** Separates OAuth complexity. Token management is orthogonal to email operations.
- **`http/`:** HTTP concerns (retry, timeouts, errors) isolated from provider logic.

## Architectural Patterns

### Pattern 1: Provider Adapter

**What:** A common interface implemented by provider-specific adapters.
**When to use:** When multiple backends provide equivalent functionality with different APIs.
**Trade-offs:** Adds abstraction overhead but isolates provider churn.

```typescript
// src/providers/base.ts
interface EmailProvider {
  listEmails(folder: string, limit?: number): Promise<EmailSummary[]>;
  getEmail(id: string): Promise<Email>;
  search(query: string): Promise<EmailSummary[]>;
  send(email: OutboundEmail): Promise<string>; // returns message ID
  reply(emailId: string, body: string): Promise<string>;
  move(emailId: string, folder: string): Promise<void>;
  delete(emailId: string): Promise<void>;
  listFolders(): Promise<Folder[]>;
}
```

### Pattern 2: Command Handler

**What:** Each CLI command is a self-contained handler with clear inputs/outputs.
**When to use:** CLI tools with multiple discrete operations.
**Trade-offs:** Simple to understand but can lead to duplication across handlers.

```typescript
// src/cli/commands/list.ts
export async function handleList(args: ListArgs): Promise<void> {
  const provider = await getProviderForAccount(args.account);
  const emails = await provider.listEmails(args.folder, args.limit);
  output.json(emails);
}
```

### Pattern 3: Token Manager with Credential Store

**What:** OAuth tokens stored in system keychain, refreshed automatically.
**When to use:** Long-running CLI tools that need persistent auth.
**Trade-offs:** Secure but adds complexity for token lifecycle.

```typescript
// src/auth/tokens.ts
export class TokenManager {
  async getValidToken(accountId: string): Promise<AccessToken> {
    const stored = await keytar.getPassword('mail-cli', accountId);
    if (stored && !isExpired(stored)) {
      return stored;
    }
    // Refresh token if expired
    const refreshed = await this.refreshToken(accountId);
    await keytar.setPassword('mail-cli', accountId, refreshed);
    return refreshed;
  }
}
```

## Data Flow

### Request Flow (Read Email Example)

```
[User: mail read --id 123 --account gmail]
    ↓
[CLI Layer: commander parses flags]
    ↓
[Command Handler: read.ts calls getProviderForAccount("gmail")]
    ↓
[Token Manager: gets valid OAuth token from keytar]
    ↓
[Gmail Provider: makes authenticated API call]
    ↓
[HTTP Client: Bun.fetch with retry on 429/503]
    ↓
[Gmail API responds with email data]
    ↓
[Provider: transforms to unified Email type]
    ↓
[Output: JSON array printed to stdout]
```

### State Management

This is a stateless CLI tool. No in-memory state between invocations.

```
[Each Invocation]
    ↓ (start)
[Load credentials from keychain]
    ↓
[Execute command with fresh OAuth token]
    ↓
[Output JSON]
    ↓ (end)
[Process exits — no state retained]
```

### Key Data Flows

1. **Auth Flow:** `mail account add` → opens browser for OAuth → stores tokens in keytar → confirms success
2. **Read Flow:** `mail read --id X` → get tokens → call provider API → transform & output JSON
3. **Send Flow:** `mail send --to X --subject Y --body Z` → get tokens → call send API → output message ID
4. **Search Flow:** `mail search "from:boss"` → get tokens → call provider search → output matches

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Monolithic single-process CLI is fine |
| 100-10K users | Add request caching (in-memory, TTL-based) |
| 10K+ users | Consider connection pooling if API rate limits hit |

### Scaling Priorities

1. **First bottleneck:** API rate limits (Gmail: 1B/day, Outlook: 10K/day) — batch operations where possible
2. **Second bottleneck:** Token refresh latency — pre-refresh tokens before expiry

## Anti-Patterns

### Anti-Pattern 1: Embedding Provider Logic in Commands

**What people do:** Put Gmail API calls directly in command handlers.
**Why it's wrong:** Mixing concerns makes switching providers impossible and testing hard.
**Do this instead:** Always go through provider interface.

### Anti-Pattern 2: Storing Tokens in Files/Env

**What people do:** `export OAUTH_TOKEN=xxx` or `~/.mail-cli-tokens`.
**Why it's wrong:** Tokens in env vars leak via `ps aux`; files are permsulnerable.
**Do this instead:** Use system keychain via `keytar`.

### Anti-Pattern 3: Provider-Specific Output Schema

**What people do:** Gmail returns `labelIds`, Outlook returns `categories` — expose both.
**Why it's wrong:** Agents need unified schema to work across providers.
**Do this instead:** Transform to unified schema in provider adapter.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Gmail API | googleapis client library | OAuth2 via googleapis/auth |
| Microsoft Graph | REST API via fetch | OAuth2 via MSAL-like flow |
| System Keychain | keytar | Falls back to file if unavailable |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI ↔ Commands | Direct function calls | Commands are thin wrappers |
| Commands ↔ Provider | Interface calls | Commands don't know which provider |
| Provider ↔ HTTP | Bun.fetch | No separate HTTP library needed |
| Auth ↔ Keytar | Sync get/set | Tokens serialized as JSON |

## Build Order Implications

```
Phase 1: Foundation
├── Project structure (folders, base types)
├── Auth layer (OAuth + keytar integration)
└── Provider interface (abstract base)

Phase 2: Single Provider (Gmail)
├── Gmail provider implementation
└── One command (list or read) to validate

Phase 3: Core Commands
├── list, read, search commands
├── send command
└── reply, move, delete commands

Phase 4: Multi-Provider
├── Outlook provider implementation
└── Provider selection logic (--account flag)

Phase 5: Polish
├── Error handling improvements
├── Output formatting
└── Edge cases (attachments, folders)
```

### Key Dependency Chain

```
auth/tokens.ts          (required by)
  ↓
providers/base.ts       (required by)
  ↓
GmailProvider/OutlookProvider  (required by)
  ↓
Command Handlers        (composed in)
  ↓
cli/index.ts            (entry point)
```

## Sources

- CLI email client patterns: mutt/neomutt architecture (training data)
- aerc email client source structure (training data)
- googleapis Node.js client patterns (training data)
- Bun.serve/HTTP patterns: `node_modules/bun-types/docs/**/*.mdx`
- Provider interface patterns: established Go/Rust CLI email clients (training data)

---

*Architecture research for: CLI Email Client*
*Researched: 2026-04-04*
