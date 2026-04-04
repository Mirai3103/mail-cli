# Phase 2: Gmail Provider - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

## Phase Boundary

Implement Gmail API integration and mailbox navigation commands. Deliver `list`, `status`, and `folders` commands that expose Gmail mailbox data as JSON. Phase 3 adds read/search/send. Phase 4 adds organization operations.

## Implementation Decisions

### List Response Fields
- **D-01:** `list` returns only essential fields: `id`, `from`, `subject`, `date`, `flags`
- **D-02:** Full `Email` body, `threadId`, `to`, `cc`, `attachments` fetched via `read` command only

### List Pagination
- **D-03:** `--limit N` flag (default 20, max 100) for page size control
- **D-04:** No page tokens — callers filter by date or use search for pagination alternatives
- **D-05:** Responses include `nextPageToken` in response metadata for scripting awareness (even if not used by CLI directly)

### Folders Command
- **D-06:** `folders` returns flat list of all labels
- **D-07:** Each entry: `{id, name, type}` where `type` is `"system"` for INBOX/STARRED/etc, `"user"` for user-created labels
- **D-08:** Use Gmail label IDs as `id` field (e.g., `INBOX`, `STARRED`, `CATEGORY_PERSONAL`)

### Status Command
- **D-09:** `status` returns `{unread: number, total: number}` — minimal essential data
- **D-10:** Counts reflect INBOX specifically (matches user mental model of "inbox status")

### Gmail API Integration
- **D-11:** Use `googleapis` npm package for Gmail API calls (Phase 1 established HTTP retry client in `src/http/`)
- **D-12:** Handle `nextPageToken` internally — Gmail API page tokens expire, use `pageToken` param
- **D-13:** Rate limit retry: exponential backoff with jitter, max 3 retries

### Error Handling
- **D-14:** Continue Phase 1 error format: `{ "error": { "code": "...", "message": "..." } }`
- **D-15:** Provider-specific errors wrapped with consistent error codes (e.g., `GMAIL_RATE_LIMIT`, `GMAIL_AUTH_ERROR`)

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Provider interface, source layout, error format from Phase 1
- `.planning/REQUIREMENTS.md` — NAV-01, NAV-02, NAV-03, ORG-04 requirements

### Project constraints
- `CLAUDE.md` — Bun runtime, googleapis package usage, error format conventions
- `.planning/PROJECT.md` — Core value: JSON only output, no prompts, agent-first design

### Gmail API
- No external specs — Gmail API is the implementation reference (https://developers.google.com/gmail/api/reference/rest)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `EmailProvider` abstract class (`src/providers/email-provider.ts`) — interface Phase 2 implements
- `GmailProvider` stub (`src/providers/gmail-provider.ts`) — currently throws "Not implemented - Phase 2"
- HTTP retry client (`src/http/client.ts`) — already has exponential backoff, reuse for Gmail API calls
- `CLIError` and `printError` (`src/utils/errors.ts`) — Phase 1 error handling pattern

### Established Patterns
- Flat `src/` layout: `src/cli.ts`, `src/providers/`, `src/auth/`, `src/http/`, `src/utils/`
- JSON output: `console.log(JSON.stringify({...}))`
- Error format: `{ "error": { "code": "...", "message": "..." } }`
- Commander.js for CLI argument parsing (already in `src/cli.ts`)

### Integration Points
- `src/cli.ts` — add `list`, `status`, `folders` commands here using GmailProvider
- `src/providers/gmail-provider.ts` — implement `list()`, `listFolders()`, add `status()` method
- `src/auth/` — GmailProvider needs `getAuthToken()` to call Gmail API with OAuth token
</codebase_context>

<specifics>
## Specific Ideas

No specific references — open to standard Gmail API approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

---

*Phase: 02-gmail-provider*
*Context gathered: 2026-04-04 via discuss-phase*
