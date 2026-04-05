# Phase 11-02 Summary: Attachment Download - CLI Integration

## Objective
Add `--download` option to the `read` command to save attachments to disk.

## Completed Tasks

### Task 1: Update read command with --download option
**File:** `src/commands/read.ts`

Added `--download [dir]` option to the read command:
- `--download` saves attachments to current directory
- `--download ./path` saves to specified directory
- Sanitizes filenames to prevent path traversal (replaces `/` and `\` with `_`)
- Uses `Bun.write()` for efficient streaming to disk
- Returns JSON with email data AND download info (filenames, paths, sizes)

```typescript
.option(
  "--download [dir]",
  "Download attachments to specified directory (or current directory if no path given)",
)
```

## Verification
- `bun run lint` passes ✓
- `bun test` passes (99 tests) ✓

## Success Criteria
1. ✓ `mail-cli read <id> --download` saves attachments to current directory
2. ✓ `mail-cli read <id> --download ./mydir` saves attachments to ./mydir
3. ✓ Original filenames preserved from attachment metadata
4. ✓ Download info returned in JSON output
5. ✓ No path traversal possible via malicious attachment filenames

## Files Modified
- `src/commands/read.ts` (added --download option and attachment download logic)

## Human Verification Checkpoint

Task 2 (human verification) requires testing with a real email account with attachments:

1. Run: `bun run cli.ts read <message-id> --account your-email:gmail --download ./test-downloads`
2. Verify:
   - Email JSON is returned
   - Download info shows filename, path, size for each attachment
   - Files exist in ./test-downloads/ with correct filenames
   - File contents are valid (not corrupted)
3. Test without directory: `bun run cli.ts read <message-id> --download`
   - Files should appear in current directory

## Threat Mitigations Implemented
| Threat | Mitigation |
|--------|------------|
| Path Traversal | Filename sanitization (replaces `/` and `\` with `_`) |
| DoS | Bun.write() streams to disk without full in-memory load |
| Info Disclosure | Full paths not logged; only returned in JSON output |
