# mail-cli

## What This Is

A fast, interactive command-line email client designed for automation and AI agent workflows. Users and agents interact entirely through command-line flags — no interactive prompts, no TUI. Targets Gmail first, Outlook second, with a unified command interface that abstracts provider differences behind a consistent JSON output schema.

## Core Value

A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Account management: Add/remove/list email accounts via OAuth2
- [ ] Mailbox navigation: List inbox, list recent emails, navigate folders/labels
- [ ] Search: Server-side search via provider's native search (Gmail search syntax / Outlook filters)
- [ ] Read email: Display email content in terminal (headers, body, attachments list)
- [ ] Compose: Send new emails via inline flags (`--to`, `--subject`, `--body`, `--body-file-path`, `--attach`)
- [ ] Reply: Send reply to existing thread (Headers-only: References/In-Reply-To set, body empty)
- [ ] Organization: Mark read/unread, trash/delete, move to folder (provider-native folder names)
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
| Provider-native folder names | No abstraction layer — user controls Gmail vs Outlook semantics directly | — Pending |
| Server-side search only | Simpler V1, leverages provider search quality | — Pending |
| OAuth2 only | Secure, supports both Gmail and Outlook properly | — Pending |
| Online-only | Avoids sync complexity for V1 | — Pending |

---

*Last updated: 2026-04-04 after initialization*
