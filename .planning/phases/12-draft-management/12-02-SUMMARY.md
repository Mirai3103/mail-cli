# Phase 12-02 Summary: Draft Commands

## Objective
Create `drafts` CLI command with `--list` and `--delete` actions.

## Completed Tasks

### Task 1: Create drafts command
**File:** `src/commands/drafts.ts`

Created `drafts` command with:
- `--list` - List all drafts for account
- `--delete <id>` - Delete a draft by ID
- JSON output for both operations

### Task 2: Register drafts command
**File:** `src/commands/index.ts`

## Verification
- `bun run lint` passes ✓
- `bun test` passes (99 tests) ✓

## Success Criteria
1. ✓ `mail-cli drafts --list` outputs JSON array of drafts
2. ✓ `mail-cli drafts --delete <id>` outputs `{"deleted": true, "id": "..."}`
3. ✓ `mail-cli drafts` without flags outputs error JSON
