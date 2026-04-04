---
phase: "06-polish"
plan: "04"
subsystem: cli
tags: [oauth, config, startup-optimization]
dependency_graph:
  requires:
    - "06-01"
  provides:
    - "loadConfig-integrated"
  affects:
    - src/cli.ts
    - src/providers/outlook-provider.ts
    - src/auth/outlook-oauth.ts
tech_stack:
  added: []
  patterns:
    - loadConfig for OAuth credential reading with env var override
    - Bun native fetch (no polyfill)
key_files:
  created: []
  modified:
    - src/cli.ts
    - src/providers/outlook-provider.ts
    - src/auth/outlook-oauth.ts
decisions:
  - "Gmail and Outlook OAuth credentials read from ~/.emailcli/config.json via loadConfig()"
  - "isomorphic-fetch removed from Outlook provider and OAuth modules (Bun has native fetch)"
metrics:
  duration: 5
  completed: "2026-04-04T15:50:28Z"
---

# Phase 06 Plan 04: Gap Closure - Config Integration and Startup Optimization

## One-liner

Integrated loadConfig() for OAuth credential reading and removed isomorphic-fetch polyfill from Outlook modules.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Integrate loadConfig into cli.ts account add commands | ae2256e | src/cli.ts |
| 2 | Remove isomorphic-fetch from outlook-provider.ts | cd598cf | src/providers/outlook-provider.ts |
| 3 | Remove isomorphic-fetch from outlook-oauth.ts | b59c70d | src/auth/outlook-oauth.ts |

## Changes Made

### Task 1: Integrate loadConfig into cli.ts

- Added `import { loadConfig } from "./utils/index.js"` to cli.ts
- Gmail account add now uses `config.gmail.clientId` and `config.gmail.clientSecret` via loadConfig()
- Outlook account add now uses `config.outlook.clientId` and `config.outlook.clientSecret` via loadConfig()
- MSAL client creation uses `config.outlook.clientId` (not process.env.OUTLOOK_CLIENT_ID)
- Updated error messages to guide users on config file option: "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET env vars, or configure ~/.emailcli/config.json"
- loadConfig already applies env var overrides internally per D-06, so no direct process.env checks needed

### Task 2: Remove isomorphic-fetch from outlook-provider.ts

- Removed `import "isomorphic-fetch"` from line 1
- Microsoft Graph client uses its own HTTP layer
- Bun has native global fetch - no polyfill needed

### Task 3: Remove isomorphic-fetch from outlook-oauth.ts

- Removed `import "isomorphic-fetch"` from line 1
- outlook-oauth.ts uses native fetch for Microsoft Graph API calls
- Bun has native global fetch - no polyfill needed

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `grep "loadConfig" src/cli.ts` - returns import and usage (3 matches)
- `grep "config.gmail.clientId" src/cli.ts` - returns Gmail credential usage
- `grep "config.outlook.clientId" src/cli.ts` - returns Outlook credential usage
- `grep "process.env.GMAIL_CLIENT_ID" src/cli.ts` - no matches (replaced by loadConfig)
- `grep "process.env.OUTLOOK_CLIENT_ID" src/cli.ts` - no matches (replaced by loadConfig)
- `grep "isomorphic-fetch" src/providers/outlook-provider.ts` - no matches
- `grep "isomorphic-fetch" src/auth/outlook-oauth.ts` - no matches

## Self-Check: PASSED

All acceptance criteria met. All three files modified as required. Commits created successfully.

## Notes

- Both Task 2 and Task 3 had their isomorphic-fetch imports on line 1, making removal straightforward
- TypeScript compilation has pre-existing errors in the codebase that are not related to this plan's changes ( Bun types, mailparser types, etc.)
- The changes are purely additive to the plan: removal of isomorphic-fetch and integration of loadConfig