# Requirements: mail-cli

**Defined:** 2026-04-04
**Core Value:** A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can authenticate via OAuth2 browser flow and store tokens securely in OS keychain
- [x] **AUTH-02**: User can list connected accounts
- [x] **AUTH-03**: User can remove a connected account

### Mailbox Navigation

- [x] **NAV-01**: User can list emails in inbox (pagination support)
- [x] **NAV-02**: User can list emails in a specific folder/label (provider-native name)
- [x] **NAV-03**: User can view mailbox status (unread count, total messages)

### Read Email

- [ ] **READ-01**: User can read a single email by ID (headers, body text, attachments list)
- [ ] **READ-02**: User can read email thread (messages in conversation via thread ID)

### Search

- [ ] **SCH-01**: User can search emails using provider's native search syntax
- [ ] **SCH-02**: Search results returned as JSON array

### Compose & Send

- [ ] **SEND-01**: User can send a new email with --to, --subject, --body flags
- [ ] **SEND-02**: User can send email with body from file (--body-file-path)
- [ ] **SEND-03**: User can send email with attachments (--attach flag, multiple allowed)
- [ ] **SEND-04**: User can reply to existing thread (References/In-Reply-To headers set, body empty)

### Organization

- [ ] **ORG-01**: User can mark email as read/unread
- [ ] **ORG-02**: User can move email to folder/label (provider-native folder name)
- [ ] **ORG-03**: User can trash/delete email
- [x] **ORG-04**: User can list available folders/labels

## v2 Requirements

### Authentication

- **AUTH-04**: Multi-account support with --account flag for provider switching

### Organization

- **ORG-05**: Batch operations (--ids flag for bulk mark/move/trash)
- **ORG-06**: Attachment download (save attachments to local filesystem)

### Compose

- **SEND-05**: Draft management (save/load/edit drafts)

## Out of Scope

| Feature | Reason |
|---------|--------|
| IMAP support | Gmail API / Microsoft Graph only per constraints |
| Offline mode | Online-only V1 per constraints |
| Local search index | Server-side search only per constraints |
| Interactive TUI | Agent-first, no prompts per Core Value |
| Auto-quoted replies | Headers-only reply per constraint |
| Unified folder abstraction | Provider-native names only per decision |
| Contacts integration | Defer to v2+ |
| Filter/rule creation | Defer to v2+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| NAV-01 | Phase 2 | Complete |
| NAV-02 | Phase 2 | Complete |
| NAV-03 | Phase 2 | Complete |
| READ-01 | Phase 3 | Pending |
| READ-02 | Phase 3 | Pending |
| SCH-01 | Phase 3 | Pending |
| SCH-02 | Phase 3 | Pending |
| SEND-01 | Phase 3 | Pending |
| SEND-02 | Phase 3 | Pending |
| SEND-03 | Phase 4 | Pending |
| SEND-04 | Phase 3 | Pending |
| ORG-01 | Phase 4 | Pending |
| ORG-02 | Phase 4 | Pending |
| ORG-03 | Phase 4 | Pending |
| ORG-04 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after initial definition*
