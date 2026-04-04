# Phase 4: Email Management - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Organization operations — mark read/unread, move to folder, trash/delete, and attachments (SEND-03). Single-email operations only. Batch operations (--ids) deferred to Phase 6 (ORG-05).

</domain>

<decisions>
## Implementation Decisions

### Trash vs delete behavior
- **D-01:** `mail-cli delete <id>` moves message to TRASH label (adds TRASH label via Gmail modify)
- Permanent deletion via separate `purge` command is out of scope for Phase 4

### Mark command interface
- **D-02:** Mark uses two boolean flags: `--read` and `--unread`
- Usage: `mail-cli mark <id> --read` or `mail-cli mark <id> --unread`
- Both flags cannot be used together (mutually exclusive)
- Error if neither is provided

### Attachment sending
- **D-03:** `send` command supports `--attach <path>` flag, repeatable (Commander array)
- Multiple attachments: `--attach file1.pdf --attach file2.pdf`
- Each attachment value is a file path (user handles glob expansion in shell)
- **D-04:** Validate file exists before sending — fail fast with FILE_NOT_FOUND error

### Batch operations (Phase 6 scope)
- Phase 4 mark/move/delete operate on single email ID only
- Phase 6 will add `--ids` flag for bulk operations (ORG-05)

### CLI output for organization commands
- **D-05:** mark/move/delete output `{"ok": true}` on success (consistent with existing pattern)
- Error responses follow existing D-14 format: `{ "error": { "code": "...", "message": "..." } }`

### Gmail API methods
- **D-06:** mark read/unread — `messages.modify` with ADD/REMOVE READ label
- **D-07:** move — `messages.modify` with ADD target label (provider-native folder name)
- **D-08:** delete/trash — `messages.modify` with ADD TRASH label

### Provider-native folder names
- **D-09:** move target is a Gmail label name (e.g., "[Gmail]/Trash", "STARRED", "[Gmail]/Sent")
- No abstraction — user passes the exact Gmail label name

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Prior Phase Context
- `src/providers/email-provider.ts` — EmailProvider interface with mark(), move(), delete() stubs
- `src/providers/gmail-provider.ts` — GmailProvider with mark/move/delete throwing "Not implemented - Phase 2"
- `src/email/composer.ts` — buildRawMessage() accepts attachments: string[] already
- `src/cli.ts` — Existing command patterns (--thread boolean flag, --to comma-separated)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SendEmailOptions.attachments: string[]` — already defined in interface, just needs wiring
- `buildRawMessage()` in composer.ts — already passes attachments to nodemailer
- `GmailProvider.mark()`, `move()`, `delete()` — stubs exist, need implementation

### Established Patterns
- Boolean flags on commands (--thread on read)
- Comma-separated multi-value options (--to on send)
- CLI output: `console.log(JSON.stringify(result))`
- Error handling: CLIError with code + message

### Integration Points
- `gmail.users.messages.modify()` — used for mark and move
- `gmail.users.labels.list()` — folder names for move validation
- nodemailer already handles attachments in composer.ts

</code_context>

<specifics>
## Specific Ideas

- Delete moves to TRASH (Gmail's recoverable delete) — no permanent delete in Phase 4
- Validate attachment files exist before API call (fail fast)
- Batch --ids deferred to Phase 6

</specifics>

<deferred>
## Deferred Ideas

### Batch operations
- ORG-05: `--ids` flag for bulk mark/move/trash — Phase 6 (Polish)

### Permanent delete
- `purge` command for immediate message deletion — future phase

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-email-management*
*Context gathered: 2026-04-04*
