# Roadmap: mail-cli

**Project:** mail-cli
**Created:** 2026-04-04
**Phases:** 6 | **Requirements:** 18 mapped

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation | 2/2 | Complete | AUTH-01, AUTH-02, AUTH-03 |
| 2 | Gmail Provider | Gmail API integration via provider interface | NAV-01, NAV-02, NAV-03, ORG-04 | 4 |
| 3 | Core Commands | 1/2 | In Progress|  |
| 4 | Email Management | 3/3 | Complete   | 2026-04-04 |
| 5 | Multi-Provider | 2/2 | Complete   | 2026-04-04 |
| 6 | Polish | 3/3 | Complete   | 2026-04-04 |

---

## Phase 1: Foundation

**Goal:** Establish project structure, OAuth2 authentication, and the provider interface.

### Requirements
- AUTH-01, AUTH-02, AUTH-03

### Success Criteria
1. `mail-cli account add --provider gmail` opens OAuth2 browser flow and stores tokens in OS keychain
2. `mail-cli account list` returns connected accounts as JSON array
3. `mail-cli account remove --account <id>` removes account and invalidates tokens

### Deliverables
- Project structure: `cli/commands/`, `providers/`, `auth/`, `http/`, `utils/`
- EmailProvider abstract class (interface)
- OAuth2 flow with keytar integration
- GmailProvider stub (interface-compliant, no-op until Phase 2)

### Plans
- [x] 01-01-PLAN.md — Foundation (interface, stubs, utilities)
- [x] 01-02-PLAN.md — OAuth2 + account commands

---

## Phase 2: Gmail Provider

**Goal:** Implement Gmail API integration and mailbox navigation.

### Requirements
- NAV-01, NAV-02, NAV-03, ORG-04

### Success Criteria
1. `mail-cli list` returns inbox emails as JSON array with id, from, subject, date, flags
2. `mail-cli list --folder "[Gmail]/Sent"` returns sent emails
3. `mail-cli status` returns unread count and total messages
4. `mail-cli folders` returns available labels/folders

### Deliverables
- GmailProvider implementation against EmailProvider interface
- list, status, folders commands
- Pagination support (handle nextPageToken)
- Exponential backoff retry for rate limits

### Plans
- [x] 02-01-PLAN.md — Interface updates (Folder.type, EmailProvider.status())
- [x] 02-02-PLAN.md — GmailProvider implementation + CLI commands

---

## Phase 3: Core Commands

**Goal:** Read, search, send, and reply functionality.

### Requirements
- READ-01, READ-02, SCH-01, SCH-02, SEND-01, SEND-02, SEND-04

### Success Criteria
1. `mail-cli read <id>` returns email headers, body, attachments list as JSON
2. `mail-cli read --thread <thread-id>` returns all messages in thread
3. `mail-cli search "from:foo subject:bar"` returns matching emails as JSON array
4. `mail-cli send --to addr --subject "X" --body "text"` sends email successfully
5. `mail-cli send --to addr --subject "X" --body-file-path body.txt` sends with file body
6. `mail-cli reply <id> --body "text"` sends reply with correct References/In-Reply-To headers

### Deliverables
- read, search, send, reply commands
- mailparser integration for email parsing
- JSON output schema (compact arrays)
- MIME multipart handling for HTML emails

### Plans
- [x] 03-01-PLAN.md — Email parsing and composition utilities (mailparser, nodemailer)
- [x] 03-02-PLAN.md — GmailProvider read/search/send/reply + CLI commands

---

## Phase 4: Email Management

**Goal:** Organization operations — mark, move, trash, and attachments.

### Requirements
- SEND-03, ORG-01, ORG-02, ORG-03

### Success Criteria
1. `mail-cli mark --id <id> --read` marks email read/unread
2. `mail-cli move --id <id> --folder "[Gmail]/Trash"` moves to trash
3. `mail-cli delete --id <id>` permanently deletes email
4. `mail-cli send --to addr --attach file.pdf` sends email with attachment

### Deliverables
- mark, move, delete commands
- Attachment send support (nodemailer)
- Provider-native folder names (no abstraction)

### Plans
- [x] 04-01-PLAN.md — GmailProvider.mark(), move(), delete() implementations
- [x] 04-02-PLAN.md — Attachment support (buildRawMessage, GmailProvider.send attachments, --attach flag)
- [x] 04-03-PLAN.md — CLI mark, move, delete commands

---

## Phase 5: Multi-Provider

**Goal:** Add Outlook support via Microsoft Graph API.

### Requirements
- AUTH-04 (multi-account)

### Success Criteria
1. `mail-cli account add --provider outlook` authenticates Outlook account
2. `mail-cli list --account outlook` uses Outlook credentials
3. Email IDs namespaced to prevent collision: `gmail:ABC123`, `outlook:XYZ789`

### Deliverables
- OutlookProvider implementation against EmailProvider interface
- --account flag for provider selection
- Account-scoped credential lookup via keytar

### Plans
- [x] 05-01-PLAN.md — Outlook OAuth module + error codes (wave 1) ✓
- [x] 05-02-PLAN.md — OutlookProvider + CLI --account flag (wave 2)

---

## Phase 6: Polish

**Goal:** Edge cases, batch operations, structured errors.

### Requirements
- ORG-05 (batch operations)

### Success Criteria
1. `mail-cli move --ids 1,2,3 --folder "X"` batch moves emails
2. All error responses return JSON envelope: `{"error": {"code": "...", "message": "..."}}`
3. CLI startup time under 200ms (measured)
4. Sub-100ms response for cached/small API calls

### Deliverables
- Batch operations (--ids flag)
- Structured error output
- Startup performance optimization
- Config file with auto-create and env override
- README for npx distribution

### Plans
- [x] 06-01-PLAN.md — Config file with auto-create and env override (wave 1)
- [x] 06-02-PLAN.md — Batch operations (--ids flag) for mark/move/delete (wave 2)
- [x] 06-03-PLAN.md — Startup optimization (remove isomorphic-fetch) + README (wave 3)

---

## Phase Ordering Rationale

1. **Auth first** — nothing works without OAuth2 tokens
2. **Provider interface before commands** — ensures Gmail/Outlook abstraction is right
3. **Gmail before Outlook** — richer API, better docs, thread IDs
4. **Core read/write before management** — primary use cases first
5. **Management before multi-provider** — single-account Gmail validated first
6. **Polish last** — after core functionality confirmed

---

## Traceability

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 5 |
| NAV-01 | Phase 2 |
| NAV-02 | Phase 2 |
| NAV-03 | Phase 2 |
| ORG-04 | Phase 2 |
| READ-01 | Phase 3 |
| READ-02 | Phase 3 |
| SCH-01 | Phase 3 |
| SCH-02 | Phase 3 |
| SEND-01 | Phase 3 |
| SEND-02 | Phase 3 |
| SEND-03 | Phase 4 |
| SEND-04 | Phase 3 |
| ORG-01 | Phase 4 |
| ORG-02 | Phase 4 |
| ORG-03 | Phase 4 |
| ORG-05 | Phase 6 |

**Coverage:** 19/19 requirements mapped ✓

---

*Roadmap created: 2026-04-04*
*Last updated: 2026-04-04*
