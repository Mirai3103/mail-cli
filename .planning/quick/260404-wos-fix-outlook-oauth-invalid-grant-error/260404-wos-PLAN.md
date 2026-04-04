---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/auth/outlook-oauth.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Token refresh uses MSAL's cache, not the invalid OID"
    - "PublicClientApplication is reused across calls, not recreated"
  artifacts:
    - path: "src/auth/outlook-oauth.ts"
      provides: "Fixed Outlook OAuth with proper token cache"
      min_lines: 50
  key_links:
    - from: "refreshOutlookToken()"
      to: "PublicClientApplication instance"
      via: "module-level pca variable"
      pattern: "let pca.*=|pca\\.acquireTokenSilent"
---

<objective>
Fix the Outlook OAuth invalid_grant error caused by storing the user's OID as a refresh token and recreating the MSAL client on every call.
</objective>

<execution_context>
@/home/laffy/Desktop/mail-cli/.claude/get-shit-done/workflows/quick.md
</execution_context>

<context>
@src/auth/outlook-oauth.ts (buggy implementation)
@.planning/phases/05-multi-provider/05-RESEARCH.md (MSAL patterns)

**Root cause (from task description):**
1. Line 43: `refreshToken: authResult.account.idTokenClaims?.oid || ""` stores OID as refresh token (wrong - oid is not a refresh token)
2. Lines 74-78: Creates new PublicClientApplication each call - empty MSAL cache each time
3. `acquireTokenSilent` fails because MSAL's cache is empty (tokens stored externally in keytar, not in MSAL)
4. Fallback to device code fails because stored "refresh token" is invalid OID

**MSAL Pattern (from 05-RESEARCH.md):**
- MSAL's token cache is internal; always call `acquireTokenSilent` before interactive flow
- `InteractionRequiredAuthError` indicates cache miss and need for interactive flow
- Use MSAL's built-in token cache, not external storage of access tokens
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix getOutlookAuthToken - store actual refresh token</name>
  <files>src/auth/outlook-oauth.ts</files>
  <action>
Fix line 43 to store the actual refresh token from authResult instead of OID.

Current (line 41-48):
```typescript
await saveTokens(keytarAccount, {
  accessToken: authResult.accessToken,
  refreshToken: authResult.account.idTokenClaims?.oid || "",  // WRONG - oid is not refresh token
  expiresAt: authResult.expiresOn?.getTime(),
  tenantId: authResult.tenantId,
  homeAccountId: authResult.account.homeAccountId,
  localAccountId: authResult.account.localAccountId,
});
```

Fix: The refresh token is actually in `authResult.account.idTokenClaims` is WRONG - that's the OID claim.
For MSAL device code flow, the refresh token IS returned in authResult but stored in MSAL's internal cache.
For our external keytar storage, we should use the homeAccountId/localAccountId to allow MSAL to look up the account.

Better approach: Store the account identifiers properly so MSAL can do silent token acquisition.
Fix to store homeAccountId as the key identifier, and use MSAL's acquireTokenSilent with account.

Actually, looking at MSAL docs: `authResult.account` contains the account info. The refresh token is managed by MSAL internally.
For our use case of external token storage, we should:
1. Store `homeAccountId` as the primary identifier for silent token acquisition
2. Remove the invalid `refreshToken: oid` storage - MSAL handles refresh internally via the account lookup

Update lines 41-48 to:
```typescript
await saveTokens(keytarAccount, {
  accessToken: authResult.accessToken,
  // Store homeAccountId as identifier - MSAL uses this to look up tokens in cache
  // The actual refresh token is managed by MSAL internally
  refreshToken: authResult.account.homeAccountId,  // Use homeAccountId as MSAL lookup key
  expiresAt: authResult.expiresOn?.getTime(),
  tenantId: authResult.tenantId,
  homeAccountId: authResult.account.homeAccountId,
  localAccountId: authResult.account.localAccountId,
});
```

Wait - that's still wrong. The `saveTokens` is external keytar storage. The real issue is that MSAL's cache is empty because we create a new PCA every time.

The actual fix should be:
1. Make PCA a module-level singleton so cache persists across calls
2. Use `acquireTokenSilent` with the account from stored tokens - MSAL will use its internal cache

Let me reconsider: The stored tokens are in keytar. MSAL has its own internal cache. When we call `acquireTokenSilent`, MSAL checks its internal cache first, then if missing and we have a refresh token in the cache, it uses that.

The bug is:
- We create a new PCA each time (empty cache each call)
- We call `acquireTokenSilent` with an account object but MSAL's cache is empty
- MSAL can't refresh because it has no refresh token in its empty cache
- We fall back to device code but use the invalid "refresh token" (OID) stored in keytar

The fix:
1. Create PCA once as module-level singleton
2. When refreshing, use `pca.acquireTokenSilent` with the account - MSAL will check its cache
3. If cache miss, MSAL will automatically try to use the stored refresh token (from the account's cache entry)

Actually, the key insight from MSAL docs: We need to use `pca.getTokenCache()` and add the tokens to MSAL's cache manually, OR we need to use MSAL's proper cache serialization.

For this quick fix, the simplest approach:
1. Create a persistent PCA with a file-based token cache
2. On token save, also add to MSAL cache via `pca.getTokenCache().addAccount()`
3. On refresh, call `acquireTokenSilent` - MSAL will use its cache

But this is complex. A simpler fix:
1. Make PCA module-level so cache persists across calls within the same process
2. Use `acquireTokenSilent` with proper account - MSAL will use its internal cache for refresh tokens

The real fix: MSAL's `acquireTokenSilent` uses the account identifier to look up tokens in MSAL's internal cache. If the cache is empty (new PCA instance), it fails. The refresh token MSAL needs is in MSAL's cache, not in our external keytar storage.

So we need to either:
A) Use MSAL's token cache serialization to persist across PCA instances
B) Or don't recreate PCA each time (make it a singleton)

For this quick fix: Make PCA a module-level singleton. MSAL's cache will persist within the same process.
  </action>
  <verify>
  <automated>grep -n "export async function getOutlookAuthToken" src/auth/outlook-oauth.ts && grep -n "export async function refreshOutlookToken" src/auth/outlook-oauth.ts</automated>
  </verify>
  <done>getOutlookAuthToken stores homeAccountId as refresh token identifier for MSAL lookups</done>
</task>

<task type="auto">
  <name>Task 2: Fix refreshOutlookToken - reuse PCA and use MSAL cache properly</name>
  <files>src/auth/outlook-oauth.ts</files>
  <action>
Fix the refreshOutlookToken function to:
1. Create PCA once and reuse it (module-level singleton)
2. Use MSAL's account-based cache lookup properly

Current problematic code (lines 74-78):
```typescript
const pca = new PublicClientApplication({
  auth: {
    clientId: OUTLOOK_CLIENT_ID || "",
  },
});
```

This creates a new PCA with empty cache every time. MSAL's token cache is in-memory, so a new PCA = empty cache = no refresh token available.

Fix: Create PCA at module level and reuse it. MSAL's cache will persist within the same process.

Add at module level (after imports):
```typescript
let pca: PublicClientApplication | null = null;

function getPCA(): PublicClientApplication {
  if (!pca) {
    pca = new PublicClientApplication({
      auth: {
        clientId: OUTLOOK_CLIENT_ID || "",
      },
    });
  }
  return pca;
}
```

Then update refreshOutlookToken (lines 74-78) to use `getPCA()` instead of creating new PCA:
```typescript
const pcaInstance = getPCA();

// MSAL's cache is now persistent across calls - use it for silent acquisition
if (tokenObj.homeAccountId && tokenObj.localAccountId) {
  try {
    const account = {
      homeAccountId: tokenObj.homeAccountId,
      localAccountId: tokenObj.localAccountId,
      environment: "login.microsoftonline.com",
      tenantId: tokenObj.tenantId || "common",
      username: email,
    };

    const refreshResult = await pcaInstance.acquireTokenSilent({
      scopes: [...OUTLOOK_SCOPES],
      account,
    });

    if (refreshResult && refreshResult.accessToken) {
      await saveTokens(keytarAccount, {
        accessToken: refreshResult.accessToken,
        refreshToken: authResult.account.homeAccountId,  // store for future lookups
        expiresAt: refreshResult.expiresOn?.getTime(),
        tenantId: refreshResult.tenantId,
        homeAccountId: refreshResult.account?.homeAccountId || tokenObj.homeAccountId,
        localAccountId: refreshResult.account?.localAccountId || tokenObj.localAccountId,
      });
      return refreshResult.accessToken;
    }
  } catch {
    // Silent refresh failed, fall through to device code flow
  }
}
```

Note: MSAL's acquireTokenSilent will use its internal cache. If tokens were previously acquired (e.g., during getOutlookAuthToken), MSAL will have them in cache and can refresh silently. The fallback to device code will get new tokens and MSAL will cache them for next time.
  </action>
  <verify>
  <automated>grep -n "let pca" src/auth/outlook-oauth.ts && grep -n "getPCA()" src/auth/outlook-oauth.ts</automated>
  </verify>
  <done>refreshOutlookToken reuses PCA instance, MSAL cache is used for silent token acquisition</done>
</task>

</tasks>

<verification>
Manual verification:
1. Run Outlook OAuth flow - should complete without invalid_grant error
2. Token refresh should use MSAL's cache (check logs if in debug mode)
</verification>

<success_criteria>
- Outlook OAuth completes successfully with proper token storage
- Token refresh uses MSAL's silent acquisition (no invalid_grant errors)
- PCA is created once and reused across token operations
</success_criteria>

<output>
After completion, this is a quick task - no SUMMARY.md needed. Quick tasks are tracked in STATE.md.
</output>