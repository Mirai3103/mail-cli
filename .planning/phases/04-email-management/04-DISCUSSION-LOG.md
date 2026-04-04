# Phase 4: Email Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-email-management
**Areas discussed:** Trash vs delete behavior, Mark/read flag design, Attachment flag, Batch operations

---

## 1. Trash vs delete behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Move to TRASH (recommended) | Adds TRASH label (recoverable, matches Gmail UX) | ✓ |
| Permanent delete | messages.delete() immediately and permanently removes the message | |
| Separate commands | delete → TRASH, purge → permanent (clearer but more commands) | |

**User's choice:** Move to TRASH (recommended)

---

## 2. Mark/read flag design

| Option | Description | Selected |
|--------|-------------|----------|
| --read and --unread flags (recommended) | mail-cli mark <id> --read  OR  mail-cli mark <id> --unread  (boolean flags) | ✓ |
| --read=true/false | mail-cli mark <id> --read=true  (explicit boolean value) | |
| mail-cli read/unread as separate commands | mail-cli read <id>  marks as read, mail-cli unread <id> marks as unread | |

**User's choice:** --read and --unread flags (recommended)

---

## 3. Attachment flag

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple --attach flags (recommended) | --attach file1.pdf --attach file2.pdf  (repeating flag, array of paths) | ✓ |
| Comma-separated paths | --attach file1.pdf,file2.pdf  (single flag, comma-separated) | |

**User's choice:** Multiple --attach flags (recommended)
**Notes:** Also selected "Validate file exists" as behavior — fail fast with FILE_NOT_FOUND before API call.

---

## 4. Batch operations

| Option | Description | Selected |
|--------|-------------|----------|
| Not in Phase 4 scope | mark/move/delete operate on single email only; --ids for Phase 6 | ✓ |

**User's choice:** Not in Phase 4 scope — Phase 6 will handle ORG-05 batch operations.

---

## Claude's Discretion

- Exact error messages for validation failures
- Whether to validate folder name exists before move
- Internal Gmail API implementation details for modify endpoint

## Deferred Ideas

- ORG-05: Batch --ids flag — Phase 6 (Polish)
- Permanent delete / purge command — future phase
