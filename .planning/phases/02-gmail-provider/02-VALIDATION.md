# Phase 2: Gmail Provider - Validation

**Generated:** 2026-04-04
**Status:** Required for phase verification gate

## Validation Framework

| Property | Value |
|----------|-------|
| Framework | bun test |
| Config file | none |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

## Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| NAV-01 | List inbox emails with pagination | unit | `bun test tests/providers/gmail-provider.test.ts` | src/providers/gmail-provider.ts |
| NAV-02 | List emails in specific label | unit | `bun test tests/providers/gmail-provider.test.ts` | src/providers/gmail-provider.ts |
| NAV-03 | Get mailbox status (unread/total) | unit | `bun test tests/providers/gmail-provider.test.ts` | src/providers/gmail-provider.ts |
| ORG-04 | List available folders/labels | unit | `bun test tests/providers/gmail-provider.test.ts` | src/providers/gmail-provider.ts |

## Wave 0 Gaps

- [ ] `tests/providers/gmail-provider.test.ts` - tests for GmailProvider list(), status(), listFolders()
- [ ] `tests/providers/gmail-provider.test.ts` - mock googleapis responses for unit tests
- [ ] `tests/utils/errors.test.ts` - tests for error handling (if not exists)
- Framework install: not needed - bun test is already in Bun runtime

## User Decision Verification

| Decision ID | Requirement | Verification Method |
|-------------|-------------|---------------------|
| D-01 | list returns id, from, subject, date, flags | Inspect returned Email objects |
| D-03 | --limit flag (default 20, max 100) | CLI flag parsing test |
| D-05 | nextPageToken in response metadata | Inspect list() output structure |
| D-07 | Folder.type is "system" or "user" | Inspect folder objects |
| D-09 | status returns {unread, total} | Inspect status() output |
| D-14 | Error format: { "error": { "code", "message" } } | Trigger error, inspect output |

## Sampling Rate

- **Per task commit:** `bun test` (entire suite, fast)
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Success Criteria

- `mail-cli list` outputs `{ emails: [...], nextPageToken?: string }`
- `mail-cli list --folder "SENT"` outputs emails from Sent folder
- `mail-cli status` outputs `{ unread: number, total: number }`
- `mail-cli folders` outputs `[{ id, name, type: "system"|"user" }, ...]`
- All commands return proper JSON error format on failure

---

*Generated from: 02-RESEARCH.md validation architecture section*
