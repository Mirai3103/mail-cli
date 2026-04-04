# Phase 3: Core Commands - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

## Phase Boundary

Phase 3 delivers read, search, send, and reply commands. These are the primary user-facing operations for interacting with email. Organization operations (mark, move, delete) come in Phase 4.

## Implementation Decisions

### Email Parsing
- **D-01:** Use `mailparser` for parsing received emails (raw RFC 2822 → structured Email object)
- **D-02:** Use `nodemailer` for constructing outgoing emails (Email object → RFC 2822 raw)

### Read Command (READ-01)
- **D-03:** `read <id>` returns full Email object including:
  - All message headers (From, To, Cc, Subject, Date, Message-ID, References, In-Reply-To, etc.)
  - `body.text` — plain text body
  - `body.html` — HTML body (if present)
  - `attachments[]` — array with `id`, `filename`, `mimeType`, `size`
- **D-04:** `read` returns `threadId` so callers can use it for reply

### Thread Read (READ-02)
- **D-05:** `read --thread <thread-id>` returns all messages in thread as JSON array in a single call
- **D-06:** Each message in array uses same full Email schema as D-03

### Search (SCH-01, SCH-02)
- **D-07:** `search "<gmail-search-syntax>"` uses Gmail native search syntax directly
- **D-08:** Search returns same fields as `list`: `{id, from, subject, date, flags}` — consistent with list behavior
- **D-09:** Search supports `--limit` flag (default 20, max 100) — same pagination as `list`

### Send Command (SEND-01, SEND-02)
- **D-10:** `send --to <addr> --subject "X" --body "text"` — body is required for new emails
- **D-11:** `send --to <addr> --subject "X" --body-file-path <file>` — body from file, file read at runtime
- **D-12:** `send` uses nodemailer to construct MIME message, then encodes to base64url for Gmail API `raw` field

### Reply Command (SEND-04)
- **D-13:** `reply <id>` — takes original message ID, sets References/In-Reply-To headers automatically
- **D-14:** Subject auto-prepends "Re: " if not already present (familiar email convention)
- **D-15:** **No `--body` flag** — reply always sends with empty body per SEND-04 spec
- **D-16:** Reply fetches original message to extract thread ID and reference headers

### Claude's Discretion
- Exact header parsing and extraction logic
- How to handle malformed/missing headers gracefully
- Error messages for edge cases (missing thread ID, malformed search syntax)

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Source layout, error format, EmailProvider interface
- `.planning/phases/02-gmail-provider/02-CONTEXT.md` — List response fields (D-01), pagination patterns (D-03, D-04)

### Project constraints
- `CLAUDE.md` — Bun runtime, googleapis package usage, error format conventions
- `.planning/PROJECT.md` — Core value: JSON only output, no prompts, agent-first design
- `.planning/REQUIREMENTS.md` — READ-01, READ-02, SCH-01, SCH-02, SEND-01, SEND-02, SEND-04

### Dependencies to add
- `nodemailer` — Not in package.json, needed for send/reply
- `mailparser` — Not in package.json, needed for read/thread parsing

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `EmailProvider` abstract class (`src/providers/email-provider.ts`) — interface already defines `read()`, `search()`, `send()`, `reply()` methods to implement
- `SendEmailOptions` interface (`src/providers/email-provider.ts`) — already defines `to`, `cc`, `bcc`, `subject`, `body`, `attachments`
- `Email` interface — already has `id`, `threadId`, `from`, `to`, `subject`, `date`, `body`, `flags`, `attachments`
- `GmailProvider` (`src/providers/gmail-provider.ts`) — currently stubs for read/search/send/reply throw "Not implemented - Phase 2"
- HTTP retry client (`src/http/client.ts`) — reuse for any direct HTTP calls
- `CLIError` and `printError` (`src/utils/errors.ts`) — Phase 1 error handling pattern

### Established Patterns
- Flat `src/` layout: `src/cli.ts`, `src/providers/`, `src/auth/`, `src/http/`, `src/utils/`
- JSON output: `console.log(JSON.stringify({...}))`
- Error format: `{ "error": { "code": "...", "message": "..." } }`
- Commander.js for CLI — already established in `src/cli.ts`
- `--limit` flag convention for pagination (Phase 2)

### Integration Points
- `src/cli.ts` — add `read`, `search`, `send`, `reply` commands here
- `src/providers/gmail-provider.ts` — implement `read()`, `search()`, `send()`, `reply()` methods
- OAuth token flow already exists via `getAuthToken()` / `refreshAccessToken()`
</codebase_context>

<specifics>
## Specific Ideas

No specific product references — following standard email semantics and Gmail API conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

---

*Phase: 03-core-commands*
*Context gathered: 2026-04-04 via discuss-phase*
