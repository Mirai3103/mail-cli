# Phase 2: Gmail Provider - Research

**Researched:** 2026-04-04
**Domain:** Gmail API integration via googleapis@171.4.0
**Confidence:** HIGH

## Summary

Phase 2 implements Gmail API integration for mailbox navigation. The Gmail API is well-documented and stable. Key findings: (1) `messages.list` returns only `{id, threadId}` - full headers require separate `messages.get` calls with `format=METADATA`, (2) labels serve as folders in Gmail, with a `type` field distinguishing system vs user labels, (3) INBOX status (unread/total) is available directly from the INBOX label resource. The `googleapis` library handles OAuth and retry internally, so no need for the `fetchWithRetry` wrapper.

**Primary recommendation:** Implement `GmailProvider` methods using `googleapis` with the `gmail.users.` resource namespace, leveraging `google.auth.OAuth2` already configured in Phase 1 auth module.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `list` returns only essential fields: `id`, `from`, `subject`, `date`, `flags`
- **D-02:** Full `Email` body, `threadId`, `to`, `cc`, `attachments` fetched via `read` command only
- **D-03:** `--limit N` flag (default 20, max 100) for page size control
- **D-04:** No page tokens - callers filter by date or use search for pagination alternatives
- **D-05:** Responses include `nextPageToken` in response metadata for scripting awareness (even if not used by CLI directly)
- **D-06:** `folders` returns flat list of all labels
- **D-07:** Each entry: `{id, name, type}` where `type` is `"system"` for INBOX/STARRED/etc, `"user"` for user-created labels
- **D-08:** Use Gmail label IDs as `id` field (e.g., `INBOX`, `STARRED`, `CATEGORY_PERSONAL`)
- **D-09:** `status` returns `{unread: number, total: number}` - minimal essential data
- **D-10:** Counts reflect INBOX specifically (matches user mental model of "inbox status")
- **D-11:** Use `googleapis` npm package for Gmail API calls
- **D-12:** Handle `nextPageToken` internally - Gmail API page tokens expire, use `pageToken` param
- **D-13:** Rate limit retry: exponential backoff with jitter, max 3 retries
- **D-14:** Continue Phase 1 error format: `{ "error": { "code": "...", "message": "..." } }`
- **D-15:** Provider-specific errors wrapped with consistent error codes (e.g., `GMAIL_RATE_LIMIT`, `GMAIL_AUTH_ERROR`)

### Claude's Discretion

- Internal method structure within GmailProvider
- How to batch/fetch headers efficiently (batch get vs individual calls)
- CLI command help text phrasing

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within Phase 2 scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | User can list emails in inbox (pagination support) | `messages.list` with `labelIds: ['INBOX']`, `maxResults`, then `messages.get` with `format=METADATA` for headers |
| NAV-02 | User can list emails in a specific folder/label (provider-native name) | Same as NAV-01 but with arbitrary `labelIds` parameter |
| NAV-03 | User can view mailbox status (unread count, total messages) | `labels.list` then extract INBOX label's `messagesUnread` and `messagesTotal` |
| ORG-04 | User can list available folders/labels | `labels.list` returns all labels with `id`, `name`, `type` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | 171.4.0 | Gmail API client | Already in package.json. Official Google library, handles OAuth2 and retries internally |
| google-auth-library | (via googleapis) | OAuth2 token management | Already used by Phase 1 auth module |

### No New Dependencies Required

All required packages already in package.json.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── providers/
│   ├── email-provider.ts    # Abstract interface (Phase 1)
│   └── gmail-provider.ts    # Implement GmailProvider here (Phase 2)
├── auth/
│   ├── index.ts             # Exports (Phase 1)
│   └── oauth.ts             # OAuth2 with keytar (Phase 1)
├── http/
│   └── client.ts            # fetchWithRetry (Phase 1) - not needed for googleapis
├── utils/
│   └── errors.ts            # CLIError, printError (Phase 1)
└── cli.ts                   # Add list, status, folders commands here
```

### GmailProvider Implementation Pattern

**Auth token retrieval (D-11):**
```typescript
// src/auth/oauth.ts exports refreshAccessToken(email) which returns access token string
import { refreshAccessToken } from "../auth/index.js";

async getAuthToken(): Promise<string> {
  return await refreshAccessToken(this.account);
}
```

**List messages flow (NAV-01, NAV-02):**
1. Call `gmail.users.messages.list({ userId: 'me', maxResults: limit, labelIds: ['INBOX'] })` for inbox
2. For each message ID, call `gmail.users.messages.get({ userId: 'me', id, format: 'METADATA', metadataHeaders: ['From', 'Subject', 'Date'] })`
3. Extract headers, map labelIds to flags (UNREAD -> 'unread', STARRED -> 'starred', etc.)
4. Return `{ id, from, subject, date, flags }[]` with `nextPageToken` in metadata

**List folders flow (ORG-04):**
1. Call `gmail.users.labels.list({ userId: 'me' })`
2. Map each label: `{ id: label.id, name: label.name, type: label.type }`
3. Gmail `label.type` is already `"system"` or `"user"` - use directly

**Mailbox status flow (NAV-03):**
1. Call `gmail.users.labels.list({ userId: 'me' })`
2. Find INBOX label: `labels.find(l => l.id === 'INBOX')`
3. Return `{ unread: label.messagesUnread, total: label.messagesTotal }`

### Anti-Patterns to Avoid

- **Do not use `fetchWithRetry` for Gmail API calls:** The `googleapis` library handles retries internally with exponential backoff. Wrapping it would cause double-retries.
- **Do not call `messages.get` for full message when only headers needed:** Use `format=METADATA` and `metadataHeaders` to minimize data transfer.
- **Do not assume all labels are folders:** Gmail labels that begin with `CATEGORY_` are category filters, not user folders. The flat list with `type` field handles this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token refresh | Build refresh logic | `refreshAccessToken()` from auth module | Already handles token storage, refresh, and re-save |
| Gmail API calls | Build raw HTTP calls | `googleapis` library | Handles auth injection, retry, pagination, format conversion |
| Rate limit handling | Build exponential backoff | `googleapis` built-in retry | Library handles 429 responses with configurable retry |

**Key insight:** The `googleapis` library is the official Google client that handles all Gmail API complexity. Do not wrap or replace it with raw fetch calls.

## Runtime State Inventory

> Skip - Phase 2 is greenfield implementation, no rename/refactor/migration.

## Common Pitfalls

### Pitfall 1: MetadataHeaders case sensitivity
**What goes wrong:** `metadataHeaders: ['from', 'subject', 'date']` returns no headers.
**Why it happens:** Gmail API expects capitalized header names: `'From'`, `'Subject'`, `'Date'`.
**How to avoid:** Always use proper case when specifying metadata headers.
**Warning signs:** Empty header values in returned email objects.

### Pitfall 2: Label vs Folder confusion
**What goes wrong:** Treating all labels as folders/containers.
**Why it happens:** Gmail labels are flat tags, not hierarchical folders. `CATEGORY_PERSONAL` is a category, not a folder.
**How to avoid:** Return flat list per D-06, let callers decide how to display. Include `type: "system"|"user"` per D-07.

### Pitfall 3: Page token expiration
**What goes wrong:** Storing `nextPageToken` and using it later fails with "invalid page token".
**Why it happens:** Gmail page tokens expire after some time (typically 1-2 weeks).
**How to avoid:** Per D-04, no page tokens in CLI - but if implementing scripting mode with `nextPageToken` in metadata, warn users it may expire.

### Pitfall 4: Missing labelIds on messages
**What goes wrong:** Email list shows no flags.
**Why it happens:** `messages.list` doesn't return labelIds by default.
**How to avoid:** The `messages.get` with `format=METADATA` should include `labelIds` in the response. Verify the response has this field.

## Code Examples

### Gmail API Authentication Setup

```typescript
// Phase 1 already has google.auth.OAuth2 configured in src/auth/oauth.ts
// Reuse the same OAuth2Client pattern for Gmail API calls
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "http://localhost:8080"
);

// Gmail API client
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
```

### List Messages (NAV-01/NAV-02)

```typescript
// Source: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: limit,
  labelIds: ['INBOX'], // or specific labelId for NAV-02
});

const messages = response.data.messages || [];
const nextPageToken = response.data.nextPageToken;

// For each message, get metadata (headers + labels)
const emails = await Promise.all(
  messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'METADATA',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });
    const headers = detail.data.payload.headers;
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
    return {
      id: msg.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      flags: detail.data.labelIds || [],
    };
  })
);
```

### List Labels/Folders (ORG-04)

```typescript
// Source: https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list
const response = await gmail.users.labels.list({
  userId: 'me',
});

const folders = response.data.labels.map(label => ({
  id: label.id,
  name: label.name,
  type: label.type, // "system" | "user"
}));
```

### Mailbox Status (NAV-03)

```typescript
// Get INBOX label for unread/total counts
const response = await gmail.users.labels.list({
  userId: 'me',
});

const inboxLabel = response.data.labels.find(l => l.id === 'INBOX');
const status = {
  unread: inboxLabel.messagesUnread || 0,
  total: inboxLabel.messagesTotal || 0,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IMAP (Thunderbird/Offlime) | Gmail API via googleapis | N/A - new project | Real-time access, no local sync needed |
| Raw HTTP to Gmail API | googleapis library | N/A - standard | Handles auth, retry, pagination automatically |
| Local folder cache | Server-side query only | Per project constraints | No offline mode, no local index |

**Deprecated/outdated:**
- Gmail API v1 is current and stable (no v2 announced)
- `googleapis` individual API packages (`@googleapis/gmail`) - `googleapis` package with namespace is more maintainable

## Open Questions

1. **Should `status()` be added to the abstract `EmailProvider` class?**
   - What we know: CONTEXT D-09 defines status output format, and NAV-03 requires it. But `EmailProvider` abstract class doesn't have a `status()` method.
   - What's unclear: Whether to add `status()` to the abstract class or keep it GmailProvider-specific.
   - Recommendation: Add `status(): Promise<{ unread: number; total: number }>` to `EmailProvider` abstract class since Outlook likely has equivalent.

2. **Should `Folder` interface be extended in `email-provider.ts`?**
   - What we know: Current `Folder` interface is `{id, name}`. CONTEXT D-07 requires `type: "system"|"user"`.
   - What's unclear: Whether to add `type` field to the shared interface or keep Gmail-specific.
   - Recommendation: Add `type?: 'system' | 'user'` to shared `Folder` interface (optional to maintain backward compatibility).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond project code - googleapis already in package.json)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun test |
| Config file | none |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | List inbox emails with pagination | unit | `bun test tests/providers/gmail-provider.test.ts` | no |
| NAV-02 | List emails in specific label | unit | `bun test tests/providers/gmail-provider.test.ts` | no |
| NAV-03 | Get mailbox status (unread/total) | unit | `bun test tests/providers/gmail-provider.test.ts` | no |
| ORG-04 | List available folders/labels | unit | `bun test tests/providers/gmail-provider.test.ts` | no |

### Sampling Rate

- **Per task commit:** `bun test` (entire suite, fast)
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/providers/gmail-provider.test.ts` - tests for GmailProvider list(), status(), listFolders()
- [ ] `tests/providers/gmail-provider.test.ts` - mock googleapis responses for unit tests
- [ ] `tests/utils/errors.test.ts` - tests for error handling (if not exists)
- Framework install: not needed - bun test is already in Bun runtime

*(If no gaps: "None - existing test infrastructure covers all phase requirements")*

## Sources

### Primary (HIGH confidence)

- `googleapis@171.4.0` - `build/src/apis/gmail/v1.d.ts` - verified Gmail API schemas and method signatures
- `src/auth/oauth.ts` - verified OAuth2Client setup, refreshAccessToken pattern
- `src/providers/email-provider.ts` - verified abstract interface
- `src/providers/gmail-provider.ts` - verified stub with "Not implemented - Phase 2"

### Secondary (MEDIUM confidence)

- [Gmail API REST Reference](https://developers.google.com/gmail/api/reference/rest) - API endpoint documentation, response formats

### Tertiary (LOW confidence)

- Training data - Gmail API best practices (needs verification against official docs)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - googleapis already in project, verified via node_modules
- Architecture: HIGH - patterns clear from Phase 1 code + API type definitions
- Pitfalls: MEDIUM - case sensitivity issues documented but not verified against runtime

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days - Gmail API stable, unlikely to change)
