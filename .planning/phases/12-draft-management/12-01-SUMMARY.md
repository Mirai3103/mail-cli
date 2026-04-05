# Phase 12-01 Summary: Draft Storage Service

## Objective
Create draft storage infrastructure: Draft domain type, DraftStorage for local JSON file persistence, and DraftService.

## Completed Tasks

### Task 1: Add Draft interface to domain types
**File:** `src/types/domain.ts`

Added `Draft` interface with all required fields.

### Task 2: Create DraftStorage infrastructure
**File:** `src/infrastructure/draft-storage.ts`

DraftStorage class with methods:
- `loadAll()` - Load drafts from `~/.emailcli/drafts.json`
- `saveAll()` - Save all drafts to disk
- `getById()` - Get draft by ID
- `listByAccount()` - List drafts for account
- `save()` - Create or update draft
- `delete()` - Delete draft by ID

### Task 3: Create DraftService
**File:** `src/services/draft-service.ts`

DraftService with account-isolated CRUD operations:
- `list(account)` - List drafts for account
- `get(id, account)` - Get draft verifying account ownership
- `save(options, account)` - Save new draft with UUID and timestamps
- `update(id, options, account)` - Update existing draft
- `delete(id, account)` - Delete draft verifying account ownership

### Task 4: Export DraftStorage and add DraftService to container
**Files:** `src/infrastructure/index.ts`, `src/container.ts`, `src/services/index.ts`

## Verification
- `bun run lint` passes ✓
- `bun test` passes (99 tests) ✓

## Success Criteria
1. ✓ Draft interface exists with id, account, to, cc, bcc, subject, body, attachments, createdAt, updatedAt
2. ✓ DraftStorage reads/writes to ~/.emailcli/drafts.json
3. ✓ DraftService.list returns only drafts for specified account
4. ✓ DraftService.get/update/delete verify account ownership
5. ✓ Container exports draftService singleton

## Files Created/Modified
- `src/types/domain.ts` (added Draft interface)
- `src/infrastructure/draft-storage.ts` (created)
- `src/services/draft-service.ts` (created)
- `src/infrastructure/index.ts` (added DraftStorage export)
- `src/services/index.ts` (added DraftService export)
- `src/container.ts` (added draftService)
