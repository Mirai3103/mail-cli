# Project Research Summary

**Project:** mail-cli
**Domain:** CLI Email Client (Bun + TypeScript)
**Researched:** 2026-04-04
**Confidence:** MEDIUM

## Executive Summary

This is a non-interactive, API-native, JSON-first CLI email client designed for automation and AI agent workflows. Unlike existing CLI email tools (aerc, neomutt) which are TUI-first with human-formatted output, this project fills a specific gap: machine-readable output, native API integration (Gmail API, Microsoft Graph), and script/agent optimization. Experts build this using a provider adapter pattern to abstract Gmail/Outlook differences behind a unified interface, with OAuth2 tokens stored in OS keychains via keytar.

The recommended approach is to build a provider abstraction layer first, then implement Gmail as the initial provider, followed by core email operations. Critical risks include token storage security (must use keychain, not files), email parsing complexity ( MIME multipart, charset handling), and rate limit handling (exponential backoff required). The project explicitly avoids interactive TUIs, offline caching, and IMAP support -- these are anti-features per the product requirements.

**Key recommendation:** Start with OAuth2 authentication + keytar integration, then build a Gmail provider against the provider interface, then implement list/read/search commands as the first validation point.

## Key Findings

### Recommended Stack

Bun 1.x with TypeScript is required per project CLAUDE.md. The core stack leverages googleapis for Gmail and @microsoft/microsoft-graph-client for Outlook, with commander for CLI argument parsing and ora/picocolors for terminal output (already in package.json). Critical security: use keytar for OAuth token storage in OS keychain (macOS Keychain, Linux libsecret, Windows Credential Manager) rather than files or environment variables. Bun.secrets is experimental and not yet suitable for production token storage.

**Core technologies:**
- **Bun 1.x**: Runtime -- native secrets API, fast startup, TypeScript-first (per CLAUDE.md)
- **googleapis ^171.4.0**: Gmail API client -- handles OAuth2, batching, pagination automatically
- **@microsoft/microsoft-graph-client ^3.x**: Microsoft Graph API for Outlook integration
- **commander ^14.0.3**: CLI argument parsing -- industry standard for Node CLI with TypeScript support
- **keytar ^7.9.0**: Secure credential storage -- OS keychain, replaces plain-text token storage
- **nodemailer ^7.x**: Email composition with MIME encoding
- **mailparser ^3.x**: Email parsing for received messages (headers, bodies, attachments)
- **Bun native fetch/$/file**: Use built-ins instead of node-fetch, execa, node:fs

### Expected Features

**Must have (table stakes):**
- OAuth2 authentication -- foundational; no email operations work without it
- List emails -- inbox/folder browsing with pagination
- Read email -- headers, body, attachment list display
- Send email -- compose and dispatch with --to, --subject, --body flags
- Reply to thread -- sets References/In-Reply-To headers correctly
- Search emails -- server-side search via provider APIs
- JSON output -- consistent, parseable, typed response structure

**Should have (competitive differentiators):**
- Thread awareness -- conversation view using provider thread IDs
- Move to folder/label -- email organization
- Mark read/unread -- status toggle
- Delete/trash -- soft delete via API
- Batch operations -- bulk actions (e.g., `mail-cli move --ids 1,2,3`)
- Account management -- multi-account add/remove/list

**Defer (v2+):**
- Attachment download (requires local storage decision)
- Webhook/polling for new email
- Draft management
- Contacts integration
- Filter/rule creation

### Architecture Approach

The architecture uses a **provider adapter pattern** with a unified EmailProvider interface implemented by GmailProvider and OutlookProvider. CLI commands live in `cli/commands/`, business logic is isolated in command handlers, and HTTP/retry logic is separated into `http/client.ts`. OAuth2 and token management are in `auth/` with keytar integration. This is a stateless CLI: each invocation loads credentials from keychain, executes with fresh OAuth token, outputs JSON, then exits.

**Major components:**
1. **CLI Layer (commander)** -- parses flags/args, dispatches to command handlers
2. **Command Handlers** -- business logic per command; go through provider interface
3. **Provider Service Layer** -- Gmail/Outlook implementations behind unified interface
4. **Auth Layer (OAuth2 + keytar)** -- token lifecycle, secure credential storage
5. **HTTP Client** -- Bun fetch with exponential backoff retry logic

### Critical Pitfalls

1. **Token storage in plain text** -- Store tokens in OS keychain via keytar. Never log tokens. Add `*.token.json` to gitignore.
2. **Gmail API rate limit blindness** -- Implement exponential backoff with jitter from day one. Track request counts. Use batch API where possible.
3. **Incomplete email parsing (HTML/UTF-8/attachments)** -- Use battle-tested mailparser library. Handle MIME multipart recursively. Test with real emails from various clients.
4. **OAuth2 redirect URI misconfiguration** -- Use OOB flow (`urn:ietf:wg:oauth:2.0:oob`) for pure CLI. Document required redirect URIs.
5. **Threading header mismanagement (References/In-Reply-To)** -- Always set In-Reply-To to original Message-ID. Append to References header (max 998 bytes per RFC 5322).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** All subsequent work depends on auth and provider interface. No features work without OAuth2.
**Delivers:** Project structure (cli/, providers/, auth/, http/, utils/), OAuth2 flow with keytar integration, provider interface (EmailProvider abstract class)
**Addresses:** OAuth2 authentication (FEATURES.md P1), token storage security (PITFALLS.md #1)
**Avoids:** Plain-text token storage, missing provider abstraction
**Research flag:** No deeper research needed -- OAuth2 patterns are well-documented

### Phase 2: Single Provider (Gmail)
**Rationale:** Validate provider interface with one provider before adding second. Gmail is more capable (thread IDs, labels) and better documented.
**Delivers:** GmailProvider implementation, one command (list or read) to validate end-to-end
**Addresses:** List emails, Read email (FEATURES.md P1)
**Avoids:** OAuth redirect URI issues (use OOB), rate limit blindness (add backoff from start)
**Research flag:** No deeper research needed -- Gmail API patterns well-documented

### Phase 3: Core Commands
**Rationale:** First user-visible functionality. Build list, read, search, send, reply in sequence based on dependencies.
**Delivers:** list, read, search, send, reply commands with JSON output
**Addresses:** Send email, Reply to thread, Search, JSON output schema (FEATURES.md P1)
**Avoids:** Gmail search syntax lock-in (abstract query layer), pagination blindness (handle nextPageToken), email parsing issues (use mailparser)
**Research flag:** Email parsing edge cases -- test with real emails during implementation

### Phase 4: Email Management
**Rationale:** Core read/write complete. Next logical step is management operations.
**Delivers:** move, delete, mark read/unread commands; folders/labels listing
**Addresses:** Move to folder, Delete/trash, Mark read/unread, Folder/label navigation (FEATURES.md P2)
**Avoids:** Threading header issues (in reply phase but reinforced here), attachment filename issues (Content-Disposition handling)
**Research flag:** No deeper research needed -- provider APIs well-documented

### Phase 5: Multi-Provider (Outlook)
**Rationale:** Second provider only after first is validated. Requires account management.
**Delivers:** OutlookProvider implementation, provider selection via --account flag, account management commands
**Addresses:** Multi-account support (FEATURES.md P2), Message ID collision handling (PITFALLS.md #8)
**Avoids:** ID collisions by namespacing: `gmail:ABC123`, `outlook:XYZ789`
**Research flag:** Microsoft Graph API -- verify current throttling limits

### Phase 6: Polish
**Rationale:** Edge cases and UX improvements after core functionality works.
**Delivers:** Attachment send (--attach), batch operations (--ids), structured error output, startup optimization
**Addresses:** Attachments send, Batch operations (FEATURES.md P2), JSON error envelope (PITFALLS.md #11)
**Avoids:** Large attachment memory issues (streaming), error channel problems
**Research flag:** None -- standard patterns

### Phase Ordering Rationale

- **Auth before provider**: No operations work without valid OAuth tokens
- **Provider interface before commands**: Ensures Gmail/Outlook abstractions are correct before building commands
- **Gmail before Outlook**: Gmail has richer features (thread IDs, labels) and simpler API for first implementation
- **Core read/write before management**: list/read/search/send/reply are the primary use cases
- **Management before multi-provider**: Account management needed for multi-provider anyway
- **Polish last**: Edge cases addressed after core works

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Core Commands):** Email parsing edge cases -- MIME multipart, charset detection, inline attachments. Needs real email testing corpus.
- **Phase 5 (Multi-Provider):** Microsoft Graph API throttling limits -- verify current documentation

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** OAuth2 + keytar patterns well-documented
- **Phase 2 (Gmail):** Gmail API patterns well-documented
- **Phase 4 (Email Management):** Provider API methods well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Bun/TypeScript required per CLAUDE.md. Other choices based on training data. WebSearch disabled during research. |
| Features | MEDIUM | Based on CLI email ecosystem knowledge and training data. WebSearch unavailable. Needs validation against user needs. |
| Architecture | MEDIUM | Provider adapter pattern well-established. CLI command handler pattern standard. |
| Pitfalls | MEDIUM | Based on domain knowledge and training data. Not verified against live sources. Several areas need verification. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Gmail API rate limits**: Gmail API quotas (1B/day, 250-1000/sec) need verification against current documentation
- **Microsoft Graph throttling**: Outlook limits (10K/day) need verification
- **OAuth2 OOB flow support**: Google may have deprecated `urn:ietf:wg:oauth:2.0:oob` -- verify before relying on it
- **Bun native secrets API**: Experimental status may change; monitor for stability
- **Email parsing library compatibility**: Verify mailparser works correctly with Bun/TypeScript
- **Real email test corpus**: Need diverse email samples for parsing validation (Gmail web, Outlook, Apple Mail, Thunderbird)

## Sources

### Primary (HIGH confidence)
- CLAUDE.md (local) -- Bun runtime requirements, banned packages
- package.json (local) -- Current project dependencies
- bun-types documentation (local) -- Bun native APIs

### Secondary (MEDIUM confidence)
- Training data -- CLI email client patterns (aerc, neomutt), googleapis, commander, keytar
- Domain expertise -- Provider interface patterns, OAuth2 flows, email threading

### Tertiary (LOW confidence)
- Gmail API best practices -- needs verification at developers.google.com/gmail/api
- Microsoft Graph throttling -- needs verification at learn.microsoft.com/graph
- OAuth2 OOB flow support -- needs verification (may be deprecated)

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
