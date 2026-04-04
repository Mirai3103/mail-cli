# Feature Research

**Domain:** CLI Email Client
**Researched:** 2026-04-04
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; based on training data and domain knowledge of CLI email ecosystem)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any CLI email tool. Missing these = product feels broken or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Read email (headers + body)** | Core use case — users must see message content | LOW | Plain text display, terminal-safe rendering of HTML if needed |
| **List emails (inbox/folder)** | Core use case — users need to browse messages | LOW | Pagination, show sender/subject/date/snippet |
| **Send email (compose)** | Core use case — composing new messages | LOW | `--to`, `--subject`, `--body` flags, `--body-file-path` for longer content |
| **Search emails** | Daily workflow — finding specific messages | MEDIUM | Server-side search via Gmail/Outlook APIs; syntax differs by provider |
| **Attachments: list** | Business emails often have attachments | LOW | Show filename/size on read |
| **Attachments: send** | Business use case — sending files | MEDIUM | `--attach` flag, MIME handling |
| **Authentication (OAuth2)** | Secure access to email provider | MEDIUM | Gmail and Microsoft Graph both require OAuth2; browser-based flow |
| **JSON output** | Machine-readable results for scripting/agents | LOW | Structured arrays, consistent schema per command |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable — especially for the agent-first positioning.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Reply to thread** | Full conversation context without copy-paste | LOW | Sets References/In-Reply-To headers correctly; body empty |
| **Thread awareness** | Conversation view, grouping by subject | LOW | Leverage Gmail/Outlook thread IDs |
| **Move to folder/label** | Email organization | LOW | Provider-native folder names (e.g., "INBOX", "[Gmail]/Sent") |
| **Mark read/unread** | Email management | LOW | Status toggle |
| **Delete/trash** | Email management | LOW | Soft delete via API |
| **Batch operations** | Efficiency — process multiple emails at once | MEDIUM | e.g., `mail-cli move --ids 1,2,3 --folder work` |
| **Account management** | Multi-account support | MEDIUM | `mail-cli account add/remove/list` |
| **Folder/list labels** | Navigation for Gmail-style label systems | LOW | `mail-cli folders` / `mail-cli labels` |
| **Filter/query builder** | Complex search expressions | MEDIUM | Abstraction over Gmail search syntax vs Outlook filters |
| **Structured error output** | Debugging failed calls | LOW | Machine-readable errors, not just exit codes |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project's constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Interactive TUI** | "Email client needs to be interactive" | Project explicitly non-interactive; agents and scripts don't use TTY prompts | Keep flag-based commands only |
| **Offline mode / local cache** | "Work without internet" | Complexity explosion: sync logic, conflict resolution, storage | Online-only V1 as stated |
| **Local search index** | "Search faster without server" | Weights project down; adds SQLite dependency; server search is good enough | Server-side search only |
| **IMAP support** | "Use with any email provider" | IMAP is stateful, complex, session-based; Gmail/Graph APIs are cleaner for V1 | Gmail API / Microsoft Graph only |
| **Unified folder abstraction** | "Don't want to learn Gmail vs Outlook differences" | Abstraction leaks (different semantics); users who care about email understand their provider | Provider-native folder names directly |
| **Auto-quoted replies** | "Reply should include original text" | quoting logic is complex, often unwanted; diffs become noisy | Headers-only replies (References/In-Reply-To), body left to user |
| **HTML rendering in terminal** | "See formatted email" | Terminal HTML rendering is messy, security concerns | Plain text fallback; raw HTML option |

## Feature Dependencies

```
[OAuth2 Authentication]
    └──required by──> [All email operations]

[Read email]
    └──enhanced by──> [Attachments list]

[List emails]
    └──enhanced by──> [Search]
    └──enhanced by──> [Folders/Labels]

[Send email]
    └──enhanced by──> [Attachments send]

[Reply to thread]
    └──requires──> [Send email]

[Move to folder]
    └──requires──> [Folders/Labels]

[Mark read/unread]
    └──requires──> [List emails]

[Delete/trash]
    └──requires──> [List emails]
```

### Dependency Notes

- **OAuth2 is foundational**: No email operations work without successful authentication.
- **Reply requires Send**: Reply is implemented as send with threading headers.
- **Batch operations enhance basic operations**: `mail-cli move --ids 1,2,3` is a loop over single-move, not a separate code path.
- **Search enhances List**: Both operate on the same mailbox; search just filters server-side.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept for agent/script use.

- [ ] **OAuth2 authentication** — Must authenticate to do anything; `mail-cli auth login`
- [ ] **List emails** — `mail-cli list --folder INBOX`; pagination, JSON array output
- [ ] **Read email** — `mail-cli read --id <id>`; headers, body, attachment list
- [ ] **Send email** — `mail-cli send --to <addr> --subject <sub> --body <text>`; compose and dispatch
- [ ] **Reply to thread** — `mail-cli reply --id <id> --body <text>`; threading headers set
- [ ] **Search** — `mail-cli search --query <expr>`; server-side, provider-native syntax
- [ ] **JSON output schema** — Consistent, parseable, typed response structure

### Add After Validation (v1.x)

Features to add once core is working and user feedback guides prioritization.

- [ ] **Account management** — Multi-account add/remove/list; `mail-cli account add`
- [ ] **Folder/label navigation** — `mail-cli folders` / `mail-cli labels`
- [ ] **Mark read/unread** — `mail-cli mark --id <id> --read/--unread`
- [ ] **Delete/trash** — `mail-cli delete --id <id>`
- [ ] **Move to folder** — `mail-cli move --id <id> --folder <name>`
- [ ] **Attachments send** — `--attach <filepath>` on send command
- [ ] **Batch operations** — `--ids 1,2,3` style for bulk actions

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Attachment download** — Fetch attachment content (requires local storage decision)
- [ ] **Email filtering/rule creation** — Server-side filter setup
- [ ] **Webhook/polling for new email** — Event-driven notifications
- [ ] **Draft management** — Save/edit drafts before sending
- [ ] **Contacts integration** — Address autocomplete

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| OAuth2 authentication | HIGH | MEDIUM | P1 |
| List emails | HIGH | LOW | P1 |
| Read email | HIGH | LOW | P1 |
| Send email | HIGH | LOW | P1 |
| Reply to thread | HIGH | LOW | P1 |
| Search | HIGH | MEDIUM | P1 |
| JSON output schema | HIGH | LOW | P1 |
| Account management | MEDIUM | MEDIUM | P2 |
| Folder/label navigation | MEDIUM | LOW | P2 |
| Mark read/unread | MEDIUM | LOW | P2 |
| Delete/trash | MEDIUM | LOW | P2 |
| Move to folder | MEDIUM | LOW | P2 |
| Attachments send | MEDIUM | MEDIUM | P2 |
| Batch operations | MEDIUM | MEDIUM | P2 |
| Attachments download | LOW | MEDIUM | P3 |
| Webhook/polling | LOW | HIGH | P3 |
| Draft management | LOW | MEDIUM | P3 |
| Contacts integration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | aerc (TUI) | neomutt (TUI) | This Project (non-interactive) |
|---------|------------|---------------|--------------------------------|
| Interactive TUI | YES | YES | NO (explicit anti-feature) |
| Batch/script mode | Partial | YES (batch) | YES (first-class) |
| JSON output | NO | NO | YES (core design) |
| Gmail API | Via IMAP | Via IMAP | Native API |
| OAuth2 | Via IMAP | Via IMAP | Native |
| Agent-friendly | NO | NO | YES |
| Offline/cache | YES | YES | NO (V1) |
| Search | Via notmuch | Via notmuch | Native server-side |

**Key insight:** Existing CLI email clients (aerc, neomutt) are TUI-first and optimize for interactive human use. They output human-formatted text, not JSON. They use IMAP, not native APIs. They all assume offline caching. None are designed for agents or script pipelines.

This project fills a specific gap: non-interactive, API-native, JSON-first CLI tool optimized for automation and AI agent workflows.

## Sources

**Confidence: LOW** — WebSearch/WebFetch unavailable at time of research. Based on:
- Training data knowledge of CLI email ecosystem (aerc, neomutt, mbsync, alpine, sylpheed)
- Project context understanding (Gmail API / Microsoft Graph API)
- Domain expertise in CLI tool design and agent workflows

**Recommended verification** (when tools available):
- `aerc` documentation: https://aerc-mail.org/
- `neomutt` features: https://neomutt.org/features
- Gmail API email scope: https://developers.google.com/gmail/api/reference/rest
- Microsoft Graph email: https://learn.microsoft.com/en-us/graph/api/resources/message

---
*Feature research for: CLI Email Client*
*Researched: 2026-04-04*
