---
phase: "01-foundation"
plan: "02"
subsystem: "auth"
tags: ["oauth", "keytar", "cli", "account-management"]
dependency_graph:
  requires: []
  provides: ["AUTH-01", "AUTH-02", "AUTH-03"]
  affects: ["cli", "providers"]
tech_stack:
  added: ["googleapis", "google-auth-library", "keytar"]
  patterns: ["OAuth2 browser flow", "keychain storage"]
key_files:
  created:
    - "src/auth/oauth.ts"
    - "src/auth/index.ts"
    - "src/cli.ts"
decisions:
  - "OAuth2 flow uses manual URL display and code paste (not callback server)"
  - "Token storage uses keytar with service='mail-cli', account=email"
  - "Gmail scope is gmail.modify (gmail.readwrite is not a valid scope)"
metrics:
  duration: "<1 hour"
  completed: "2026-04-04"
---

# Phase 1 Plan 2: OAuth2 Authentication Summary

## One-liner

OAuth2 browser-based authentication with keytar keychain storage for Gmail accounts.

## What Was Built

Created the OAuth2 authentication module and CLI account management commands:

- **src/auth/oauth.ts**: OAuth2 authentication with Google APIs
  - `generateAuthUrl()`: Creates OAuth2 authorization URL
  - `getAccessToken()`: Exchanges verification code for tokens
  - `saveTokens()` / `getTokens()` / `deleteTokens()`: Keytar keychain operations
  - `listAccounts()`: Lists all stored accounts
  - `refreshAccessToken()`: Refreshes expired access tokens

- **src/auth/index.ts**: Barrel export for auth module

- **src/cli.ts**: Commander CLI with account commands
  - `account add --provider <gmail|outlook>`: Initiates OAuth flow
  - `account list`: Lists connected accounts
  - `account remove --account <id>`: Removes account from keychain

## Verification

| Test | Result |
|------|--------|
| `bun run src/cli.ts account list` | `[]` |
| `generateAuthUrl()` URL contains `gmail.modify` scope | PASS |
| `bun run src/cli.ts account remove --account nonexistent@example.com` | Proper JSON error |
| OAuth browser flow | FIXED (scope error corrected) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Invalid Gmail OAuth scope**
- **Found during:** Task 3 (OAuth verification)
- **Issue:** `gmail.readwrite` is not a valid Gmail OAuth scope
- **Fix:** Replaced with `gmail.modify` scope which provides read/write access
- **Files modified:** `src/auth/oauth.ts`
- **Commit:** f886893

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use `gmail.modify` scope | Gmail API uses modify scope for read/write operations; `gmail.readwrite` does not exist |
| Manual code paste flow | Per Phase 1 Context: user copies verification code from browser and pastes in CLI |

## Commits

- `0015240` feat(01-foundation-02): create OAuth2 authentication module
- `f886893` fix(01-foundation-02): replace invalid gmail.readwrite scope with gmail.modify

## Requirements Addressed

| Requirement | Description | Status |
|-------------|-------------|--------|
| AUTH-01 | Add account via OAuth2 | Complete |
| AUTH-02 | Remove account | Complete |
| AUTH-03 | List accounts | Complete |

---

*Plan executed: 2026-04-04*
