# mail-cli State

## Project Reference

**Core Value:** A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

**Current Focus:** Phase 1 — Foundation

## Current Position

| Field | Value |
|-------|-------|
| Current Phase | 1 - Foundation |
| Current Plan | Not started |
| Phase Status | Not started |
| Overall Progress | 0/18 v1 requirements |

**Progress Bar:** [                    ] 0/6 phases

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements Completed | 0/18 v1 |
| Plans Created | 0/6 |
| Plans Executed | 0/6 |

## Phase Status

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 1 | Foundation | AUTH-01, AUTH-02, AUTH-03 (3) | Not started |
| 2 | Gmail Provider | NAV-01, NAV-02, NAV-03, ORG-04 (4) | Not started |
| 3 | Core Commands | READ-01, READ-02, SCH-01, SCH-02, SEND-01, SEND-02, SEND-04 (7) | Not started |
| 4 | Email Management | SEND-03, ORG-01, ORG-02, ORG-03 (4) | Not started |
| 5 | Multi-Provider | AUTH-04 (v2) | Not started |
| 6 | Polish | v2 items | Not started |

## Accumulated Context

### Key Decisions
- Bun runtime (per CLAUDE.md)
- Gmail API / Microsoft Graph only (no IMAP)
- OAuth2 only (no app passwords or env vars)
- JSON only output (no human-prettified modes)
- Online-only (no offline queue or sync)
- Provider-native folder names (no abstraction)
- Server-side search only (no local index)
- Provider adapter pattern: GmailProvider, OutlookProvider behind EmailProvider interface

### Phase Dependencies
```
Phase 1 (Foundation) → Phase 2 (Gmail Provider) → Phase 3 (Core Commands) → Phase 4 (Email Management) → Phase 5 (Multi-Provider) → Phase 6 (Polish)
```

### Blockers
None identified yet.

### Notes
- Brownfield init: existing scaffold detected
- Agent-first: LLM agents parsing JSON and shell scripts piping data
- Performance: sub-100ms for cached/small ops, sub-200ms startup
- Personal daily driver use case — reliability over feature breadth

## Session Continuity

| Session | Date | Completed |
|---------|------|-----------|
| 1 | 2026-04-04 | Roadmap created |

---

*State last updated: 2026-04-04*
