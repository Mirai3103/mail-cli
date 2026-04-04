---
phase: 03
slug: core-commands
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test (per CLAUDE.md) |
| **Config file** | None - uses default bun test runner |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test --all` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test`
- **After every plan wave:** Run `bun test --all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 1 | READ-01 | unit | `bun test src/email/parser.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 03-01 | 1 | READ-02 | unit | `bun test src/email/parser.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 03-01 | 1 | SEND-01, SEND-02 | unit | `bun test src/email/composer.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 03-02 | 2 | READ-01, READ-02 | unit | `bun test src/providers/gmail-provider.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 03-02 | 2 | SCH-01, SCH-02 | unit | `bun test src/providers/gmail-provider.test.ts` | ❌ W0 | ⌜ pending |
| 03-02-03 | 03-02 | 2 | SEND-01, SEND-02, SEND-04 | unit | `bun test src/providers/gmail-provider.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-04 | 03-02 | 2 | SEND-04 | unit | `bun test src/providers/gmail-provider.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/email/parser.ts` — mailparser wrapper (decodeBase64UrlRaw, parseGmailRaw) - covers READ-01
- [ ] `src/email/composer.ts` — nodemailer wrapper (buildRawMessage, buildReplyMessage) - covers SEND-01, SEND-02, SEND-04
- [ ] `src/providers/gmail-provider.test.ts` — unit tests for read, search, send, reply
- [ ] `src/email/parser.test.ts` — unit tests for mailparser wrapper
- [ ] `src/email/composer.test.ts` — unit tests for nodemailer wrapper
- [ ] `src/email/parser.test.ts` — stub tests for REQ-READ-01
- [ ] `src/email/composer.test.ts` — stub tests for REQ-SEND-01, SEND-02, SEND-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end send via Gmail API | SEND-01, SEND-02 | Requires live Gmail account and OAuth token | 1. `bun run src/cli.ts send --to test@example.com --subject "Test" --body "Hello"` 2. Verify email received in inbox |
| End-to-end reply via Gmail API | SEND-04 | Requires existing thread in live Gmail account | 1. Get message ID from inbox 2. `bun run src/cli.ts reply <id>` 3. Verify reply appears in thread |
| Thread read from live Gmail | READ-02 | Requires existing thread in live Gmail account | 1. Get thread ID from list 2. `bun run src/cli.ts read --thread <thread-id>` 3. Verify JSON array returned |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase: 03-core-commands*
*Validation strategy generated: 2026-04-04 from 03-RESEARCH.md*
