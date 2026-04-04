# mail-cli

## What This Is

A fast, interactive command-line email client designed for automation and AI agent workflows. Users and agents interact entirely through command-line flags — no interactive prompts, no TUI. Targets Gmail first, Outlook second, with a unified command interface that abstracts provider differences behind a consistent JSON output schema.

## Core Value

A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

## Requirements

### Validated

- [x] Account management: Add/remove/list email accounts via OAuth2 (Phase 1: AUTH-01, AUTH-02, AUTH-03)
- [x] Mailbox navigation: List inbox, list emails in folders, mailbox status, folder listing (Phase 2: NAV-01, NAV-02, NAV-03, ORG-04)
- [x] Read email: Display email content with headers, body, attachments (Phase 3: READ-01, READ-02)
- [x] Search: Server-side search via Gmail native syntax (Phase 3: SCH-01, SCH-02)
- [x] Compose: Send new emails via `--to`, `--subject`, `--body`, `--body-file-path` (Phase 3: SEND-01, SEND-02)
- [x] Reply: Send reply with threading headers, empty body (Phase 3: SEND-04)
- [x] Organization: Mark read/unread, trash/delete, move to folder, attachments (Phase 4: ORG-01, ORG-02, ORG-03, SEND-03)
- [x] Multi-provider: Outlook/Office 365 support via Microsoft Graph API with MSAL OAuth2, multi-account CLI via --account flag (Phase 5: AUTH-04)

### Active

- [ ] Structured output: All commands return parseable JSON arrays

### Out of Scope

- Offline mode — online-only V1 (no local cache/sync)
- Local search index — server-side search only
- Interactive TUI or prompt-based flows
- Auto-quoted replies — headers only
- Unified label/folder abstraction — use provider-native names directly
- IMAP support — Gmail API / Microsoft Graph API only

## Context

- Existing project scaffold detected (`package.json`, `index.ts`, `tsconfig.json`) — this is a brownfield init
- Personal daily driver use case — reliability matters over feature breadth
- Agent-first: both LLM agents parsing JSON and shell scripts piping data
- Performance constraint: sub-100ms response for cached/small operations, sub-200ms startup

## Constraints

- **Runtime**: Bun (not Node) — per project CLAUDE.md defaults
- **APIs**: Gmail API / Microsoft Graph only — no IMAP
- **Auth**: OAuth2 browser flow — no app passwords or env vars
- **Output**: JSON only — no human-prettified output modes
- **Concurrency**: Online-only — no offline queue or sync

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Unified command interface | Same commands regardless of provider — agents don't need provider logic | — Pending |
| JSON array output | Compact, pipe-friendly, easy for agents to parse | — Pending |
| Provider-native folder names | No abstraction layer — user controls Gmail vs Outlook semantics directly | ✓ Validated (Phase 4) |
| Server-side search only | Simpler V1, leverages provider search quality | — Pending |
| OAuth2 only | Secure, supports both Gmail and Outlook properly | ✓ Validated (Phase 1) |
| Online-only | Avoids sync complexity for V1 | — Pending |

---

*Last updated: 2026-04-04 after Phase 5 completion*
