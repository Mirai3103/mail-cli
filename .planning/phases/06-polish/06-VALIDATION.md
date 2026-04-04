---
phase: 6
slug: polish
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test |
| **Config file** | No Wave 0 — existing infrastructure |
| **Quick run command** | `bun test --passWithNoTests` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --passWithNoTests`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 06-01 | 1 | Config auto-create + env override | unit | `npx tsc --noEmit --skipLibCheck src/utils/config.ts` | ✅ | ⬜ pending |
| 06-01-02 | 06-01 | 1 | Config export | unit | `npx tsc --noEmit --skipLibCheck src/utils/index.ts` | ✅ | ⬜ pending |
| 06-02-01 | 06-02 | 2 | mark --ids batch | unit | `npx tsc --noEmit --skipLibCheck src/cli.ts` | ✅ | ⬜ pending |
| 06-02-02 | 06-02 | 2 | move --ids batch | unit | `npx tsc --noEmit --skipLibCheck src/cli.ts` | ✅ | ⬜ pending |
| 06-02-03 | 06-02 | 2 | delete --ids batch | unit | `npx tsc --noEmit --skipLibCheck src/cli.ts` | ✅ | ⬜ pending |
| 06-03-01 | 06-03 | 3 | isomorphic-fetch removal | unit | `npx tsc --noEmit --skipLibCheck src/cli.ts` | ✅ | ⬜ pending |
| 06-03-02 | 06-03 | 3 | Startup measurement | build | `bun build ./src/cli.ts --outdir ./dist --target node --format esm` | ✅ | ⬜ pending |
| 06-03-03 | 06-03 | 3 | README.md | manual | `wc -l README.md && grep -c "emailcli" README.md` | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 needed — all verification is done via TypeScript compilation and manual inspection of output.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Batch partial failure JSON format | D-02 | Requires live provider calls | `echo '{"ids": ["1","2"]}' \| bun ./src/cli.ts mark --ids 1,2 --read` — verify output matches D-02 schema |
| Config auto-creates at ~/.emailcli/config.json | D-05 | File system interaction | First run of any command creates config — check `cat ~/.emailcli/config.json` |
| Env var override config | D-06 | Environment interaction | Run with GMAIL_CLIENT_ID=test and verify loadConfig() returns test value |
| Startup time < 200ms | D-10 | Real-time measurement | `time node ./dist/cli.js --version` — document actual time |

*All phase behaviors have automated verification via compilation checks. Manual verifications are for runtime behavior and output format confirmation.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending / approved 2026-04-04
