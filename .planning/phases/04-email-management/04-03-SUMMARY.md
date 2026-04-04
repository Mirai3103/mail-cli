---
phase: 04-email-management
plan: 03
subsystem: cli
tags: [cli, gmail, organization, commander]

# Dependency graph
requires:
  - phase: 04-email-management
    provides: GmailProvider.mark(), GmailProvider.move(), GmailProvider.delete() methods
provides:
  - mark CLI command with --read/--unread mutually exclusive flags
  - move CLI command with required --folder option
  - delete CLI command with trash semantics (D-01)
affects:
  - Phase 04 (email-management)
  - Phase 05 (multi-provider)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CLI command pattern with accounts check and JSON output
    - Mutually exclusive flags validation with CLIError codes

key-files:
  created: []
  modified:
    - src/cli.ts - Added mark, move, delete commands

key-decisions:
  - "D-02: mark command uses mutually exclusive --read and --unread flags"
  - "D-05: All organization commands output {\"ok\": true} on success"
  - "D-01: delete moves to TRASH, not permanent delete"

patterns-established:
  - "Mutually exclusive flag validation pattern using CLIError"
  - "Required option validation using requiredOption()"

requirements-completed:
  - ORG-01
  - ORG-02
  - ORG-03

# Metrics
duration: 3min
completed: 2026-04-04
---

# Phase 04 Plan 03: Email Organization CLI Commands

**Added mark, move, and delete CLI commands with mutually exclusive flag validation and JSON output**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T13:06:44Z
- **Completed:** 2026-04-04T13:10:01Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- mark command with --read/--unread mutually exclusive validation
- move command with required --folder option for provider-native folder names
- delete command with trash semantics (D-01)
- All commands output {"ok": true} on success
- MISSING_FLAG and CONFLICTING_FLAGS error codes for validation

## Task Commits

Each task was committed atomically:

1. **fix(04-03): add non-null assertions for account in mark/move/delete commands** - `4914408` (fix)

## Files Created/Modified

- `src/cli.ts` - Added mark, move, delete CLI commands following existing command patterns

## Decisions Made

- Used existing command pattern with accounts check, provider instantiation, and JSON output
- D-02 mutually exclusive flags validated before provider call
- D-01 delete uses TRASH label per specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript errors in pre-existing code were already present and unrelated to this plan.

## Next Phase Readiness

- Phase 04 email-management organization commands complete
- Ready for Phase 05 multi-provider work

---
*Phase: 04-email-management*
*Completed: 2026-04-04*
