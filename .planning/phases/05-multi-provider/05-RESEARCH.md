# Phase 5: Multi-Provider - Research

**Researched:** 2026-04-04
**Domain:** Microsoft Graph API / Outlook integration + multi-account architecture
**Confidence:** HIGH (official Microsoft docs, npm registry verified)

## Summary

Phase 5 adds Outlook support via Microsoft Graph API and multi-account support via the `--account` flag. The implementation mirrors the GmailProvider pattern: a new OutlookProvider class implements the same EmailProvider interface, with a separate Outlook OAuth flow using MSAL. Key differences from Gmail: Graph uses OData pagination (`@odata.nextLink`), folder IDs instead of names for queries, `conversationId` maps to `threadId`, and send uses `POST /me/sendMail` with JSON payload.

**Primary recommendation:** Create `OutlookProvider` as a parallel implementation to `GmailProvider`, reuse the keytar-based token storage with provider-suffixed account names, and implement a new MSAL-based OAuth flow for Outlook.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- IDs prefixed with provider: `gmail:ABC123`, `outlook:XYZ789`
- keytar storage: `email:provider` account name format (`me@gmail.com:gmail`, `me@outlook.com:outlook`)
- `--account` flag for provider selection
- Use `@microsoft/microsoft-graph-client` SDK
- Azure app registration with localhost redirect (`http://localhost:8080`)
- Microsoft Graph scopes: `Mail.Read`, `Mail.Send`, `Mail.ReadBasic`, `User.Read`, `offline_access`
- Outlook folder names: provider-native (`Inbox`, `Sent Items`)
- `conversationId` mapped to `threadId` for schema consistency

### Claude's Discretion
- Exact Azure app setup instructions (client ID/secret storage)
- Pagination implementation details for Outlook API
- How Outlook folder hierarchy maps to flat folder list

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within Phase 5 scope.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @microsoft/microsoft-graph-client | 3.0.7 (verified npm) | Microsoft Graph API client | Required per CONTEXT.md D-11 |
| @azure/msal-node | 5.1.2 (verified npm) | OAuth2/MSAL for Node.js | Industry standard for Azure AD delegated auth |
| nodemailer | 8.0.4 (existing) | MIME message construction | Already in package.json, used for building send payloads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| isomorphic-fetch | latest | Fetch polyfill for Graph SDK | Required for Node.js < 18 with @microsoft/microsoft-graph-client |

### Not Used / Alternatives
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| @microsoft/microsoft-graph-client | @microsoftgraph/msgraph-sdk-node (official successor) | 3.x is the current stable; 4.x is newer but 3.x is well-documented |
| MSAL standalone | @azure/identity | MSAL Node is more appropriate for desktop CLI with delegated user auth |

**Installation:**
```bash
bun add @microsoft/microsoft-graph-client @azure/msal-node isomorphic-fetch
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── auth/
│   ├── index.ts           # existing exports
│   ├── oauth.ts           # existing Gmail OAuth
│   ├── outlook-oauth.ts   # NEW: Outlook OAuth via MSAL
│   └── outlook-auth.ts    # NEW: Outlook token management (save/get/refresh)
├── providers/
│   ├── index.ts           # update exports
│   ├── email-provider.ts  # existing interface
│   ├── gmail-provider.ts  # existing implementation
│   └── outlook-provider.ts # NEW: OutlookProvider implementation
├── cli.ts                 # modify: add --account flag to all commands
└── utils/errors.ts        # existing: add OUTLOOK_* error codes
```

### Pattern 1: OutlookProvider behind EmailProvider Interface
**What:** OutlookProvider implements the same abstract EmailProvider class as GmailProvider
**When to use:** For all email operations (list, read, search, send, mark, move, delete, folders)
**Implementation:**
```typescript
// Source: EmailProvider interface (src/providers/email-provider.ts)
// OutlookProvider implements all abstract methods
export class OutlookProvider extends EmailProvider {
  readonly provider = "outlook";
  account: string;

  async list(folder: string = "Inbox", limit: number = 20): Promise<{ emails: Email[]; nextPageToken?: string }> {
    // Use Graph API: GET /me/mailFolders/{folderId}/messages
    // Or GET /me/messages with $filter
    // Pagination via @odata.nextLink
  }

  async read(id: string): Promise<Email> {
    // GET /me/messages/{id} with $select for metadata + body
  }

  async send(msg: SendEmailOptions): Promise<string> {
    // POST /me/sendMail with JSON body
  }

  // ... all other EmailProvider methods
}
```

### Pattern 2: Namespaced ID Format
**What:** All email IDs prefixed with provider name to prevent collision
**When to use:** Every ID returned from or passed to provider methods
**Implementation:**
```typescript
// gmail:ABC123 -> provider=gmail, id=ABC123
// outlook:XYZ789 -> provider=outlook, id=XYZ789

// In OutlookProvider.read(id):
const localId = id.replace(/^outlook:/, '');
const message = await graphClient.api(`/me/messages/${localId}`).get();

// When returning:
return { id: `outlook:${message.id}`, threadId: `outlook:${message.conversationId}`, ... };
```

### Pattern 3: Multi-Account Resolution in CLI
**What:** CLI resolves account to provider using keytar account name format
**When to use:** Every command that needs a provider
**Implementation:**
```typescript
// Source: CONTEXT.md D-07, D-08
// keytar account names: "me@gmail.com:gmail", "me@outlook.com:outlook"

async function resolveProvider(accountFlag?: string): Promise<EmailProvider> {
  const accounts = await listAccounts(); // returns keytar account names

  if (!accountFlag) {
    if (accounts.length === 0) throw new CLIError("NO_ACCOUNTS", "No accounts configured");
    if (accounts.length === 1) {
      account = accounts[0];
    } else {
      throw new CLIError("MULTIPLE_ACCOUNTS",
        `Multiple accounts found. Use --account to specify one of: ${accounts.join(", ")}`);
    }
  } else {
    if (!accounts.includes(accountFlag)) {
      throw new CLIError("ACCOUNT_NOT_FOUND", `Account ${accountFlag} not found`);
    }
    account = accountFlag;
  }

  // Parse provider from account name suffix
  const provider = account.endsWith(":gmail") ? "gmail" : "outlook";
  if (provider === "gmail") return new GmailProvider(account);
  return new OutlookProvider(account);
}
```

### Pattern 4: Microsoft Graph Client Initialization
**What:** Create Graph client with MSAL-backed auth provider
**When to use:** Every OutlookProvider method that makes API calls
**Implementation:**
```typescript
// Source: Microsoft Learn Graph SDK docs
// For MSAL-based delegated auth in Node.js CLI

import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.OUTLOOK_CLIENT_ID,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    authority: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  },
});

// For delegated user auth (interactive OAuth flow):
// - Use MSAL to get user tokens via interactive browser flow
// - Store refresh tokens in keytar
// - Use refresh token to get access token for Graph calls

// For actual Graph calls:
const client = Client.init({
  authProvider: (done) => {
    // Get token via refreshAccessToken for this account
    done(null, accessToken);
  },
});
```

### Pattern 5: Outlook Folder Resolution
**What:** Outlook uses folder IDs not names for API queries; need to resolve displayName to ID first
**When to use:** list(), status() commands with folder parameter
**Implementation:**
```typescript
// Source: Microsoft Graph API docs (user-list-mailfolders)
// Folder displayNames: "Inbox", "Sent Items", "Drafts", etc.
// But API queries require folder ID: GET /me/mailFolders/{folder-id}/messages

async function getFolderId(displayName: string): Promise<string | null> {
  const folders = await this.listFolders();
  const folder = folders.find(f => f.name === displayName);
  return folder?.id || null;
}

// Then use in list():
const folderId = await this.getFolderId(folder);
if (folderId) {
  // GET /me/mailFolders/{folderId}/messages?$top={limit}
} else {
  // fallback to GET /me/messages (top-level, no folder filter)
}
```

### Pattern 6: OAuth2 MSAL Flow for Outlook
**What:** Interactive browser-based OAuth2 flow using MSAL Node
**When to use:** `account add --provider outlook` command
**Implementation:**
```typescript
// Source: MSAL Node documentation
// Similar to Gmail oauth.ts pattern but with MSAL

import { PublicClientApplication } from "@azure/msal-node";
import * as open from "open";

const pca = new PublicClientApplication({
  auth: {
    clientId: process.env.OUTLOOK_CLIENT_ID,
    redirectUri: "http://localhost:8080",
  },
});

// MSAL scopes for Outlook
const SCOPES = [
  "Mail.Read",
  "Mail.Send",
  "Mail.ReadBasic",
  "User.Read",
  "offline_access",  // for refresh token
];

// Initiate auth code flow, open browser, exchange code for tokens
const authResult = await pca.acquireTokenByDeviceCode({
  deviceCodeCallback: (response) => {
    console.log(response.message); // User visits URL and enters code
  },
  scopes: SCOPES,
});

// Store tokens in keytar with provider suffix
await saveTokens(`${email}:outlook`, authResult.result);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 flow | Build custom MSAL wrapper | @azure/msal-node | Complex MSAL protocol, token refresh, device code flow all handled |
| MIME encoding | Build custom email builder | nodemailer | Already in package.json; handles attachments, multipart, encoding |
| Graph API HTTP layer | Build raw fetch calls | @microsoft/microsoft-graph-client | Handles auth header injection, error parsing, OData |
| Pagination | Build custom nextLink parser | @odata.nextLink from SDK response | SDK returns full response with @odata.nextLink |

**Key insight:** Microsoft Graph SDK handles the complex parts: auth header management, error response normalization, OData query building. For Outlook, the SDK approach is far superior to raw fetch calls.

## Common Pitfalls

### Pitfall 1: Node.js Version Fetch Polyfill
**What goes wrong:** @microsoft/microsoft-graph-client requires fetch polyfill on Node.js < 18
**Why it happens:** The SDK uses native fetch by default; older Node versions lack it
**How to avoid:** Install `isomorphic-fetch` and import it before the Graph client
**Warning signs:** `ReferenceError: fetch is not defined` errors when using OutlookProvider

### Pitfall 2: Folder ID vs Folder Name Confusion
**What goes wrong:** Using folder displayName ("Inbox") directly in API calls instead of folder ID
**Why it happens:** Gmail uses label names directly; Outlook requires folder ID
**How to avoid:** Always resolve folder displayName to ID via listFolders() before querying messages
**Warning signs:** 404 errors on folder queries, or messages from wrong folder

### Pitfall 3: Token Refresh with MSAL
**What goes wrong:** Access token expires but refresh fails silently or with cryptic MSAL errors
**Why it happens:** MSAL refresh token flow differs from Google's; need proper cache handling
**How to avoid:** Use MSAL's built-in token cache; always call acquireTokenSilent before interactive flow
**Warning signs:** `InteractionRequiredAuthError` or 401 on Graph API calls

### Pitfall 4: Incomplete Error Wrapping
**What goes wrong:** Raw Graph API errors leak through without proper OUTLOOK_* codes
**Why it happens:** Graph API returns complex nested error objects
**How to avoid:** Wrap all Graph calls in try/catch with CLIError("OUTLOOK_*", ...)
**Warning signs:** Unhandled promise rejections, generic error messages in JSON output

### Pitfall 5: ID Prefixing Inconsistency
**What goes wrong:** IDs returned from different methods have inconsistent prefixing
**Why it happens:** Some methods extract IDs from responses, others construct them
**How to avoid:** Enforce prefix at boundary: prefix on return, strip on send to API
**Warning signs:** IDs like `outlook:outlook:ABC123` (double prefix) or `ABC123` (no prefix)

## Code Examples

### List Messages in Folder
```typescript
// Source: Microsoft Learn Graph API - user-list-messages
// Pattern: GET /me/mailFolders/{folderId}/messages?$top={limit}

const response = await graphClient
  .api(`/me/mailFolders/${folderId}/messages`)
  .select("id,conversationId,subject,sender,receivedDateTime,isRead")
  .top(limit)
  .get();

// Pagination: response["@odata.nextLink"] contains URL for next page
const nextPageToken = response["@odata.nextLink"];

const emails = response.value.map((msg: any) => ({
  id: `outlook:${msg.id}`,
  threadId: `outlook:${msg.conversationId}`,
  from: msg.sender.emailAddress.address,
  subject: msg.subject,
  date: msg.receivedDateTime,
  flags: msg.isRead ? ["read"] : ["unread"],
}));
```

### Send Email
```typescript
// Source: Microsoft Learn Graph API - user-sendMail
// Pattern: POST /me/sendMail with JSON body

const sendMailPayload = {
  message: {
    subject: msg.subject,
    body: {
      contentType: "Text",
      content: msg.body,
    },
    toRecipients: msg.to.map((address: string) => ({
      emailAddress: { address },
    })),
    ccRecipients: msg.cc?.map((address: string) => ({
      emailAddress: { address },
    })),
  },
  saveToSentItems: true,
};

await graphClient.api("/me/sendMail").post(sendMailPayload);
```

### Mark as Read/Unread
```typescript
// Source: Microsoft Learn Graph API - message-update
// Pattern: PATCH /me/messages/{id} with isRead property

await graphClient
  .api(`/me/messages/${localId}`)
  .update({ isRead: read }); // true = read, false = unread
```

### Get Full Message Body
```typescript
// Source: Microsoft Learn Graph API - message-get
// Note: body is returned as HTML by default; use Prefer header for text

const message = await graphClient
  .api(`/me/messages/${localId}`)
  .header("Prefer", 'outlook.body-content-type="text"')
  .select("id,conversationId,subject,body,from,toRecipients,ccRecipients,sentDateTime,receivedDateTime,hasAttachments,attachments")
  .get();
```

### List Folders
```typescript
// Source: Microsoft Learn Graph API - user-list-mailfolders
// Pattern: GET /me/mailFolders

const response = await graphClient.api("/me/mailFolders").get();

const folders: Folder[] = response.value.map((folder: any) => ({
  id: folder.id,
  name: folder.displayName,
  type: folder.isHidden ? "user" : "system", // approximate mapping
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw REST calls to Gmail API | googleapis library | Phase 1-2 | Handles auth, batching, pagination automatically |
| IMAP for Outlook | Microsoft Graph API | Phase 5 | Modern OAuth-only API, no IMAP support needed |
| Gmail label names in queries | Outlook folder IDs in queries | Phase 5 | Must resolve folder name to ID first |

**Deprecated/outdated:**
- Azure AD v1.0 endpoint: Use `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` (v2.0 endpoint)
- @microsoft/microsoft-graph-client v2.x: Migrate to v3.x (better TypeScript support, ESM)

## Open Questions

1. **How to handle Outlook folder hierarchy for folder listing?**
   - What we know: Folders have `displayName` ("Inbox", "Sent Items"), `parentFolderId`, `childFolderCount`
   - What's unclear: How to represent nested folders in flat `Folder[]` list (D-15 says "provider-native names")
   - Recommendation: Return flat list with `parentFolderId` for hierarchy awareness; list command shows all folders

2. **Should Outlook provider support searching by folder in the Graph query syntax?**
   - What we know: Graph supports `$filter` query parameter, e.g., `$filter=folderId eq '{folderId}'`
   - What's unclear: Whether Graph search syntax is compatible with Gmail search syntax
   - Recommendation: Pass Graph-compatible KQL via $filter for folder-scoped search

3. **How to handle the `readThread` method for Outlook conversations?**
   - What we know: Graph has `conversationId` but no single "get all messages in conversation" endpoint
   - What's unclear: Whether to fetch all messages with same conversationId or use a separate endpoint
   - Recommendation: Use `GET /me/messages?$filter=conversationId eq '{id}'&$orderby=receivedDateTime asc`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | ✓ | 1.x | N/A |
| @azure/msal-node | Outlook OAuth | not installed | — | Install via `bun add @azure/msal-node` |
| @microsoft/microsoft-graph-client | Outlook API | not installed | — | Install via `bun add @microsoft/microsoft-graph-client` |
| isomorphic-fetch | Graph SDK polyfill | not installed | — | Install via `bun add isomorphic-fetch` |
| OUTLOOK_CLIENT_ID | Outlook OAuth | ✗ | — | Set via environment variable |
| OUTLOOK_CLIENT_SECRET | Outlook OAuth | ✗ | — | Set via environment variable |

**Missing dependencies with no fallback:**
- OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET: These are Azure app credentials. User must register an Azure app. Documentation should include setup instructions.

**Missing dependencies with fallback:**
- None -- all packages available via bun add

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun test (per CLAUDE.md) |
| Config file | none -- per-wave setup |
| Quick run command | `bun test` |
| Full suite command | `bun test --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-04 | Multi-account support via --account flag | unit | `bun test src/providers/outlook-provider.test.ts` | pending |
| AUTH-04 | Account resolution (single/multiple accounts) | unit | `bun test src/providers/outlook-provider.test.ts` | pending |
| AUTH-04 | Provider selection based on account name suffix | unit | `bun test src/providers/outlook-provider.test.ts` | pending |
| *all* | OutlookProvider implements EmailProvider interface | unit | `bun test src/providers/outlook-provider.test.ts` | pending |
| *all* | ID namespacing (outlook: prefix) | unit | `bun test src/providers/outlook-provider.test.ts` | pending |
| *all* | Error codes OUTLOOK_* | unit | `bun test src/utils/errors.test.ts` | pending |

### Sampling Rate
- **Per task commit:** `bun test src/providers/outlook-provider.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/providers/outlook-provider.test.ts` -- unit tests for OutlookProvider
- [ ] `src/providers/outlook-provider.ts` -- main implementation
- [ ] `src/auth/outlook-oauth.ts` -- Outlook OAuth flow with MSAL
- [ ] `src/auth/outlook-auth.ts` -- Outlook token storage/refresh
- [ ] `src/auth/index.ts` -- update exports for outlook auth
- [ ] `src/providers/index.ts` -- update exports for OutlookProvider

## Sources

### Primary (HIGH confidence)
- [Microsoft Learn: List messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages) -- Pagination via @odata.nextLink, $top parameter
- [Microsoft Learn: Get message](https://learn.microsoft.com/en-us/graph/api/message-get) -- Message properties, body content types
- [Microsoft Learn: user-sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail) -- Send email with JSON payload, attachments
- [Microsoft Learn: message-update](https://learn.microsoft.com/en-us/graph/api/message-update) -- Mark read/unread via PATCH
- [Microsoft Learn: user-list-mailFolders](https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders) -- Folder structure, displayName vs ID
- [npm: @microsoft/microsoft-graph-client@3.0.7](https://www.npmjs.com/package/@microsoft/microsoft-graph-client) -- SDK version, authentication patterns
- [npm: @azure/msal-node@5.1.2](https://www.npmjs.com/package/@azure/msal-node) -- MSAL version for OAuth

### Secondary (MEDIUM confidence)
- [GitHub: msgraph-sdk-javascript](https://github.com/microsoftgraph/msgraph-sdk-javascript) -- Client.init patterns, authProvider usage

### Tertiary (LOW confidence)
- None -- all critical sources verified via official Microsoft documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- npm versions verified, official Microsoft SDK docs
- Architecture: HIGH -- Microsoft Graph API well-documented, GmailProvider pattern provides clear implementation template
- Pitfalls: HIGH -- Common issues identified from Microsoft documentation and community patterns

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- Graph API is stable, SDK versions may update)
