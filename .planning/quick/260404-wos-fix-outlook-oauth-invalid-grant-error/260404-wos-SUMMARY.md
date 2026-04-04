---
phase: quick
plan: "260404-wos"
type: execute
subsystem: auth
tags: [outlook, oauth, msal, bug-fix]
dependency_graph:
  requires: []
  provides: []
  affects: [src/auth/outlook-oauth.ts]
tech_stack:
  added: []
  patterns: [PCA singleton for MSAL cache persistence]
key_files:
  created: []
  modified:
    - src/auth/outlook-oauth.ts
decisions: []
metrics:
  duration: ~1 minute
  completed: "2026-04-04T16:38:42Z"
---

# Quick Task 260404-wos: Fix Outlook OAuth invalid_grant Error

## Summary

Fixed Outlook OAuth `invalid_grant` error by correcting token storage and making MSAL's PublicClientApplication a module-level singleton.

## Bug Root Cause

1. **Wrong token stored as refreshToken**: Line 43 stored `authResult.account.idTokenClaims?.oid` as refresh token. OID (Object ID) is a user identifier, NOT a refresh token.
2. **PCA recreated each call**: `refreshOutlookToken` created a new `PublicClientApplication` on each invocation, resulting in an empty MSAL token cache every time.
3. **Silent token acquisition failed**: `acquireTokenSilent` failed because MSAL's cache was empty (no refresh token available).
4. **Fallback to device code failed**: Used the invalid OID as "refresh token" causing `invalid_grant` error from Microsoft identity platform.

## Changes Made

**1. Added PCA singleton (lines 7-18)**
```typescript
let pca: PublicClientApplication | null = null;

function getPCA(): PublicClientApplication {
  if (!pca) {
    pca = new PublicClientApplication({...});
  }
  return pca;
}
```

**2. Fixed getOutlookAuthToken (lines 38, 54)**
- Uses `getPCA()` instead of creating new PCA
- Stores `homeAccountId` as refreshToken instead of invalid OID

**3. Fixed refreshOutlookToken (lines 86, 109, 134)**
- Uses `getPCA()` instead of creating new PCA each time
- Stores `homeAccountId` as refreshToken on successful refresh

## Deviations from Plan

None - plan executed exactly as written.

## Verification

Truths confirmed:
- [x] Token refresh uses MSAL's cache, not the invalid OID
- [x] PublicClientApplication is reused across calls, not recreated

Artifacts:
- [x] `src/auth/outlook-oauth.ts` - 162 lines, contains PCA singleton

## Commit

- `b5c80b8` - fix(outlook-oauth): fix invalid_grant by using PCA singleton and proper token identifiers

## Self-Check: PASSED

- [x] File modified: `src/auth/outlook-oauth.ts` exists
- [x] Commit exists: `b5c80b8`
- [x] PCA singleton pattern verified: `let pca` and `getPCA()` present
