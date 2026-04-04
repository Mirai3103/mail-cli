---
phase: 5
slug: multi-provider
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test |
| **Config file** | bun.lockb (lockfile) — no config file needed |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test --reporter=tap` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test`
- **After every plan wave:** Run `bun test --reporter=tap`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | AUTH-04 | unit | `bun test src/providers/outlook-provider.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | AUTH-04 | unit | `bun test src/auth/outlook-oauth.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | AUTH-04 | integration | `bun test src/providers/outlook-provider.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/providers/outlook-provider.test.ts` — stubs for OutlookProvider methods
- [ ] `src/auth/outlook-oauth.test.ts` — stubs for Outlook OAuth flow
- [ ] Existing `bun test` passes (Gmail-only tests still green)
- [ ] `@microsoft/microsoft-graph-client` installed and importable

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth2 browser flow (Outlook) | AUTH-04 | Requires interactive browser + Azure app | 1. Run `mail-cli account add --provider outlook` 2. Complete Azure AD login 3. Verify tokens stored in keychain |
| ID namespace in JSON output | AUTH-04 | CLI output verification | `mail-cli list --account me@outlook.com:outlook` — verify IDs start with `outlook:` |
| Cross-provider list | AUTH-04 | Requires both accounts connected | 1. Connect Gmail + Outlook 2. `mail-cli list` without --account returns only Gmail 3. `mail-cli list --account me@outlook.com:outlook` returns only Outlook |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

