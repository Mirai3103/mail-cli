---
phase: 05-multi-provider
plan: "01"
subsystem: auth
tags: [outlook, microsoft-graph, msal, oauth2, azure]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: keytar token storage, OAuth2 flow patterns, CLIError class
provides:
  - Outlook OAuth2 module using MSAL device code flow
  - OUTLOOK_* error codes for consistent error handling
  - @microsoft/microsoft-graph-client and @azure/msal-node dependencies installed
affects:
  - phase-05-plan-02 (OutlookProvider implementation)
  - phase-06-polish (multi-account integration)

# Tech tracking
tech-stack:
  added: [@microsoft/microsoft-graph-client@3.0.7, @azure/msal-node@5.1.2, isomorphic-fetch]
  patterns: [MSAL device code flow for CLI apps, provider-suffixed keytar account names]

key-files:
  created: [src/auth/outlook-oauth.ts]
  modified: [src/utils/errors.ts, package.json, bun.lock]

key-decisions:
  - "MSAL PublicClientApplication for Outlook OAuth2 (device code flow)"
  - "Token storage uses email:outlook keytar account format per D-07"
  - "Device code flow acceptable for CLI apps (user visits URL + enters code)"
  - "OUTLOOK_SCOPES = Mail.Read, Mail.Send, Mail.ReadBasic, User.Read, offline_access"

patterns-established:
  - "Pattern: Provider-specific OAuth modules in src/auth/ (outlook-oauth.ts follows oauth.ts pattern)"
  - "Pattern: OUTLOOK_* error codes as commented throw examples in errors.ts"

requirements-completed: [AUTH-04]

# Metrics
duration: ~6min
completed: 2026-04-04
---

# Phase 05, Plan 01: Outlook OAuth Foundation Summary

**Outlook OAuth2 module using MSAL device code flow with keytar token storage**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-04T14:19:30Z
- **Completed:** 2026-04-04T14:25:36Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Installed @microsoft/microsoft-graph-client@3.0.7, @azure/msal-node@5.1.2, and isomorphic-fetch
- Added OUTLOOK_AUTH_ERROR, OUTLOOK_API_ERROR, OUTLOOK_TOKEN_REFRESH_ERROR codes to errors.ts
- Created src/auth/outlook-oauth.ts with getOutlookAuthToken(), refreshOutlookToken(), getOutlookUserEmail()
- All 18 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Outlook dependencies** - `2351029` (feat)
2. **Task 2: Add OUTLOOK_* error codes** - `3238f15` (feat)
3. **Task 3: Create Outlook OAuth module** - `01239c7` (feat)

## Files Created/Modified

- `package.json` - Added @microsoft/microsoft-graph-client, @azure/msal-node, isomorphic-fetch
- `bun.lock` - Lockfile updated with new dependencies
- `src/utils/errors.ts` - Added OUTLOOK_AUTH_ERROR, OUTLOOK_API_ERROR, OUTLOOK_TOKEN_REFRESH_ERROR codes
- `src/auth/outlook-oauth.ts` - New Outlook OAuth module with MSAL device code flow

## Decisions Made

- MSAL device code flow is appropriate for CLI apps (user visits URL + enters code, no redirect needed)
- Token storage uses "email:outlook" keytar account format per D-07
- Silent token refresh attempted first, falls back to device code flow on failure
- Graph API /me endpoint used to resolve user email after authentication

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed invalid `open` import and fixed MSAL type errors**
- **Found during:** Task 3 (Create Outlook OAuth module)
- **Issue:** `open` package not installed; `redirectUri` not valid in MSAL NodeAuthOptions; `AccountInfo` requires `localAccountId`
- **Fix:** Removed unused `open` import; removed `redirectUri` from PublicClientApplication constructors; added `homeAccountId` and `localAccountId` to stored token object for proper account reconstruction
- **Files modified:** src/auth/outlook-oauth.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` shows no errors in outlook-oauth.ts
- **Committed in:** `01239c7` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type errors fixed to ensure module compiles correctly. No scope creep.

## Issues Encountered

- MSAL Node 5.x `PublicClientApplication` constructor does not take `redirectUri` in `NodeAuthOptions` - removed invalid property
- MSAL `AccountInfo` type requires `localAccountId` field - added to stored token structure

## User Setup Required

**Azure AD app registration required before `account add --provider outlook` will work.**

The plan's user_setup section specifies:
- Azure Portal app registration with redirect URI `http://localhost:8080`
- API permissions: Mail.Read, Mail.Send, Mail.ReadBasic, User.Read, offline_access
- Environment variables needed: OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET
- Full setup instructions are in the plan's `user_setup` frontmatter section

## Next Phase Readiness

- Plan 05-02 (OutlookProvider implementation) can proceed
- Outlook OAuth module is ready to be integrated with `account add --provider outlook` command
- No blockers remaining

---
*Phase: 05-multi-provider*
*Completed: 2026-04-04*
