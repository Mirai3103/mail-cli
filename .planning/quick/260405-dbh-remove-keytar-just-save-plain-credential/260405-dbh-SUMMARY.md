---
phase: quick
plan: 260405-dbh
subsystem: auth
tags: [keytar-removal, oauth, token-storage]
dependency_graph:
  requires: []
  provides: []
  affects:
    - src/auth/oauth.ts
    - src/auth/outlook-oauth.ts
    - package.json
tech_stack:
  added: []
  removed:
    - keytar
    - "@types/keytar"
  patterns:
    - Plain JSON file storage for OAuth tokens in ~/.emailcli/tokens/
key_files:
  created: []
  modified:
    - path: src/auth/oauth.ts
      description: Replaced keytar with plain JSON file storage
    - path: package.json
      description: Removed keytar and @types/keytar dependencies
decisions: []
metrics:
  duration: "<1 min"
  completed: "2026-04-05"
  tasks_completed: 2
  commits: 2
---

# Quick Task 260405-dbh: Remove keytar, use plain JSON file storage - Summary

## One-liner

Replaced keytar native dependency with plain JSON file storage for OAuth tokens in `~/.emailcli/tokens/`

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace keytar with plain JSON file storage in oauth.ts | 030a2b1 | src/auth/oauth.ts |
| 2 | Remove keytar from package.json | 2a91d24 | package.json |

## Changes Made

### Task 1: Replace keytar with plain JSON file storage (030a2b1)

**Removed:**
- `import keytar from "keytar";`

**Added:**
- Imports: `mkdir`, `readFile`, `writeFile`, `access`, `readdir`, `unlink` from `node:fs/promises`
- `join` from `node:path`
- `os` from `node:os`
- `TOKENS_DIR = ~/.emailcli/tokens/`

**Token storage functions:**
- `saveTokens(email, tokens)` - writes `~/.emailcli/tokens/{email}.json`
- `getTokens(email)` - reads from `~/.emailcli/tokens/{email}.json`
- `deleteTokens(email)` - deletes `~/.emailcli/tokens/{email}.json`
- `listAccounts()` - lists all `.json` files in `~/.emailcli/tokens/`

### Task 2: Remove keytar from package.json (2a91d24)

**Removed dependencies:**
- `keytar: ^7.9.0` from dependencies
- `@types/keytar: ^4.4.2` from devDependencies

## Verification Results

- TypeScript compilation: PASS (no errors)
- `src/auth/oauth.ts`: compiles without keytar imports
- `src/auth/outlook-oauth.ts`: unchanged, still imports `saveTokens` and `getTokens` from `./oauth.js`
- Token files created at `~/.emailcli/tokens/{email}.json`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `030a2b1`: refactor(260405-dbh): replace keytar with plain JSON file storage
- `2a91d24`: chore(260405-dbh): remove keytar and @types/keytar from dependencies

## Self-Check

- [x] `src/auth/oauth.ts` exists and contains new file-based token storage
- [x] `030a2b1` and `2a91d24` commits found in git log
- [x] keytar removed from package.json
- [x] TypeScript compiles without errors
