# Phase 2: Gmail Provider - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-gmail-provider
**Areas discussed:** List response fields, Pagination approach, Folders command design, Status command output

---

## List Response Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Essential only | id, from, subject, date, flags only. Fast, minimal. Body/threadId fetched on `read`. | ✓ |
| Standard set | id, threadId, from, subject, date, flags, snippet (body preview). Balanced view without full body. | |
| Full Email | All Email fields including body, to, cc, attachments list. Most flexible but slower. | |

**User's choice:** Essential only (recommended)
**Notes:** Fast and minimal. Full Email fetched on `read`.

---

## Pagination Approach

| Option | Description | Selected |
|--------|-------------|----------|
| --limit only | Simple: --limit N (default 20, max 100). No page tokens. Caller can filter by date or use search for paging. | ✓ |
| --limit + --page-token | --limit N for page size, --page-token string from previous response to get next page. Scriptable but more complex. | |
| Cursor-based | Track position via message ID. --before-id N scrolls back through history. Simple for sequential access. | |

**User's choice:** --limit only (recommended)
**Notes:** Simple, no page tokens needed.

---

## Folders Command Design

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list | All labels shown as {id, name}. System labels get type indicator: {id:"INBOX", name:"INBOX", type:"system"}. | ✓ |
| Grouped by type | Output grouped: {system: [...], user: [...]}. More structure, harder to parse. | |
| Hide system labels | Only show user-created labels. INBOX etc are implicit and always available anyway. | |

**User's choice:** Flat list (recommended)
**Notes:** Simple and clear, type indicator differentiates system vs user labels.

---

## Status Command Output

| Option | Description | Selected |
|--------|-------------|----------|
| Essential | {unread: N, total: M} — minimal, focused, matches success criteria. | ✓ |
| Extended | {unread: N, total: M, inbox: X, starred: Y, drafts: Z} — more context, future-proof. | |
| Verbose | Full label counts: for each label, the message count. Most complete but verbose. | |

**User's choice:** Essential (recommended)
**Notes:** Minimal, matches success criteria.

---

## Deferred Ideas

None — discussion stayed within Phase 2 scope.
