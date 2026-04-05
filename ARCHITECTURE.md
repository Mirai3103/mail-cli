# Architecture

mail-cli follows Clean Architecture principles to maintain separation of concerns and ensure the codebase remains testable, maintainable, and adaptable to provider changes.

## Overview

The architecture divides the application into four distinct layers, each with a specific responsibility. Dependencies flow inward — inner layers know nothing about outer layers.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 CLI Presentation Layer                       │
│    list.ts  read.ts  send.ts  search.ts  mark.ts  ...       │
│    reply.ts  delete.ts  move.ts  folders.ts  status.ts      │
│    account.ts                                                 │
└────────────────────────────┬────────────────────────────────┘
                             │ depends on
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                Application Services Layer                   │
│         MailboxService  EmailService  ComposeService        │
│                   AccountService                            │
└────────────────────────────┬────────────────────────────────┘
                             │ depends on
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Types Layer                       │
│   EmailProviderPort  TokenStoragePort  ConfigPort  ...      │
│   Email  Folder  ListResult  MailboxStatus  SendEmailOpts  │
└────────────────────────────┬────────────────────────────────┘
                             │ implements
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
│   GmailProvider  OutlookProvider  TokenStorageImpl          │
│                  ConfigImpl                                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Command (CLI)
       │
       ▼
┌─────────────────┐
│  Command Handler│  src/commands/*.ts
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│    Service      │  src/services/*.ts
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│     Port        │  src/types/ports.ts (interfaces)
└────────┬────────┘
         │ implemented by
         ▼
┌─────────────────┐
│   Provider      │  src/infrastructure/*.ts
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│  External API   │  Gmail API / Microsoft Graph
└─────────────────┘
```

## Layer Details

### Presentation Layer (CLI)

**Location:** `src/commands/`

The presentation layer handles all user interaction via Commander.js command definitions. Each command is a separate file responsible for:
- Parsing CLI arguments and flags
- Calling the appropriate service
- Formatting and outputting JSON responses

Commands registered: `list`, `read`, `send`, `search`, `mark`, `move`, `delete`, `reply`, `folders`, `status`, `account`

### Application Services Layer

**Location:** `src/services/`

Services contain pure business logic with no knowledge of CLI frameworks or external APIs:

| Service | Responsibility |
|---------|----------------|
| `MailboxService` | List emails, manage folders, mailbox status |
| `EmailService` | Read, search, mark, move, delete emails |
| `ComposeService` | Send emails, handle replies |
| `AccountService` | Manage OAuth accounts, authentication |

### Domain Types Layer

**Location:** `src/types/`

This layer defines interfaces (ports) that abstract external dependencies:

| Port | Purpose |
|------|---------|
| `EmailProviderPort` | Interface for email providers (Gmail, Outlook) |
| `TokenStoragePort` | Interface for secure token storage |
| `ConfigPort` | Interface for configuration loading |

Domain types: `Email`, `Folder`, `ListResult`, `MailboxStatus`, `SendEmailOptions`

### Infrastructure Layer

**Location:** `src/infrastructure/`

Concrete implementations of the ports defined in the domain layer:

| Implementation | Port |
|----------------|------|
| `GmailProvider` | EmailProviderPort (Google Gmail API) |
| `OutlookProvider` | EmailProviderPort (Microsoft Graph API) |
| `TokenStorageImpl` | TokenStoragePort (OS keychain via keytar) |
| `ConfigImpl` | ConfigPort (file-based config) |

## Key Design Decisions

### 1. Dependency Injection

Services receive provider instances through constructor injection. This allows swapping implementations without modifying service code:

```typescript
class EmailService {
  constructor(private provider: EmailProviderPort) {}

  async read(id: string): Promise<Email> {
    return this.provider.read(id);
  }
}
```

### 2. Swappable Providers

Since all providers implement `EmailProviderPort`, adding a new email provider requires only:
1. Create a new provider class implementing `EmailProviderPort`
2. Add provider detection logic in the CLI

No changes needed to services or commands.

### 3. No Commander in Services

Commander.js is confined to the presentation layer. Services accept plain JavaScript objects and return typed results, making them framework-agnostic and easy to test.

### 4. JSON-Only Output

The CLI outputs pure JSON for all operations, enabling:
- Easy parsing by scripts and AI agents
- Consistent error format via `{ error: { code, message } }`
- Batch operation support with partial failure reporting

## Adding a New Command

1. Create `src/commands/newcmd.ts`
2. Define command options using Commander
3. Import and call the appropriate service
4. Output JSON response
5. Register in `src/commands/index.ts`

## Adding a New Provider

1. Create `src/infrastructure/newprovider.ts`
2. Implement `EmailProviderPort` interface
3. Add provider detection in `src/commands/utils/resolve-provider.ts`
4. No changes to services or existing commands needed
