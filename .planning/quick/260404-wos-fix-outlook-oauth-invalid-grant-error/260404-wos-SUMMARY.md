---
phase: quick
plan: "260404-wos"
type: execute
subsystem: auth
tags: [outlook, oauth, msal, bug-fix]
dependency_graph:
  requires: []
  provides: []
  affects: [src/auth/outlook-oauth.ts, src/cli.ts]
tech_stack:
  added: [MSAL cache persistence]
  patterns: [PCA singleton, CachePlugin with disk persistence]
key_files:
  created: []
  modified:
    - src/auth/outlook-oauth.ts
    - src/cli.ts
decisions: []
metrics:
  duration: ~10 minutes (iterative debugging)
  completed: "2026-04-04T17:15:00Z"
---

# Quick Task 260404-wos: Fix Outlook OAuth invalid_grant Error

## Status: COMPLETED

Fixed through iterative debugging - initial PCA singleton fix was insufficient.

## Root Causes Found (Iterative)

1. **PCA singleton alone doesn't work** - MSAL cache is in-memory, only persists within same process
2. **MSAL cache not persisted to disk** - Needed CachePlugin with file-based cache
3. **Wrong environment in account lookup** - Used `login.microsoftonline.com` but cache has `login.windows.net`
4. **Keytar account suffix bug** - Passed `email:outlook` but appended another `:outlook`
5. **cli.ts had duplicate MSAL code** - bypassed the outlook-oauth module entirely

## Fixes Applied

### Fix 1: MSAL Cache Persistence to Disk (~/.emailcli/outlook-msal-cache.json)

```typescript
function createCachePlugin(): CachePlugin {
  return {
    beforeCacheAccess: async (cacheContext) => {
      cacheContext.tokenCache.deserialize(await readCache());
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.hasChanged) {
        await writeCache(cacheContext.tokenCache.serialize());
      }
    },
  };
}
```

### Fix 2: homeAccountId as MSAL Lookup Key

Changed from `idTokenClaims.oid` to `homeAccountId` - oid is NOT a refresh token.

### Fix 3: Correct MSAL Environment

Changed from `login.microsoftonline.com` to `login.windows.net` (what MSAL actually stores).

### Fix 4: Keytar Account Suffix

```typescript
const baseEmail = email.replace(/:outlook$/, "");
const keytarAccount = `${baseEmail}:outlook`;
```

### Fix 5: cli.ts Uses outlook-oauth Module

Refactored `account add --provider outlook` to use `getOutlookAuthToken()` from outlook-oauth.ts.

## Commits

- `b5c80b8` - fix(outlook-oauth): fix invalid_grant by using PCA singleton and proper token identifiers
- `a5cd1bb` - fix(cli): use homeAccountId instead of oid as refreshToken in account add outlook
- `d63c734` - fix(outlook): multiple OAuth fixes for persistent token refresh

## Verification

```bash
$ bun ./src/cli.ts list --folder INBOX --limit 2
{"emails":[{"id":"outlook:...","from":"account-security-noreply@accountprotection.microsoft.com",...}]}
```

Outlook OAuth now works with persistent token refresh across CLI invocations.
