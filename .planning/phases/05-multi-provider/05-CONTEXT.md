# Phase 5: Multi-Provider - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Outlook support via Microsoft Graph API and multi-account support via `--account` flag. Gmail remains the default provider. Email IDs are namespaced to prevent collision between providers.

</domain>

<decisions>
## Implementation Decisions

### ID Namespace Format
- **D-01:** IDs prefixed with provider: `gmail:ABC123`, `outlook:XYZ789`
- **D-02:** `Email.id` field contains the namespaced string — no separate `provider` field needed
- **D-03:** All list/search results return namespaced IDs; read/mark/move/delete accept namespaced IDs

### Outlook OAuth2 Setup
- **D-04:** Azure app registration required — separate from Gmail OAuth
- **D-05:** Redirect URI: `http://localhost:8080` (same as Gmail for consistency)
- **D-06:** Microsoft Graph scopes: `Mail.Read`, `Mail.Send`, `Mail.ReadBasic`, `User.Read`, `offline_access`
- **D-07:** keytar storage: append provider to email as account name — `me@gmail.com:gmail`, `me@outlook.com:outlook`

### Multi-Account Selection
- **D-08:** `--account <id>` flag on all commands — value is the keytar account name (e.g., `me@gmail.com:gmail` or just `me@outlook.com`)
- **D-09:** When `--account` omitted and exactly one account exists: use that account
- **D-10:** When `--account` omitted and multiple accounts exist: error with message listing available accounts

### Microsoft Graph SDK
- **D-11:** Use `@microsoft/microsoft-graph-client` npm package for Outlook API calls
- **D-12:** Implement `OutlookProvider` against same `EmailProvider` interface as `GmailProvider`

### Outlook Provider Scope
- **D-13:** All EmailProvider methods: `list`, `read`, `search`, `send`, `reply`, `mark`, `move`, `delete`, `status`, `listFolders`
- **D-14:** Thread support: use Microsoft Graph `conversationId` instead of Gmail's `threadId` (both mapped to `Email.threadId` field for schema consistency)
- **D-15:** Folder names: use Outlook folder names directly (e.g., `Inbox`, `Sent Items`) — provider-native per project decision

### Command Changes
- **D-16:** `account add --provider outlook` triggers Outlook OAuth2 flow
- **D-17:** All existing commands accept `--account` flag to scope to specific provider/account

### Error Handling
- **D-18:** Provider-specific errors wrapped with consistent codes: `OUTLOOK_AUTH_ERROR`, `OUTLOOK_RATE_LIMIT`, etc.
- **D-19:** Error format: `{ "error": { "code": "...", "message": "...", "provider": "outlook" } }`

### Claude's Discretion
- Exact Azure app setup instructions (client ID/secret storage)
- Pagination implementation details for Outlook API
- How Outlook folder hierarchy maps to flat folder list

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Provider interface
- `src/providers/email-provider.ts` — EmailProvider abstract class interface all providers must implement

### Existing implementations
- `src/providers/gmail-provider.ts` — GmailProvider implementation (reference for OutlookProvider)
- `src/auth/oauth.ts` — Gmail OAuth flow (reference for Outlook OAuth implementation)

### Project constraints
- `CLAUDE.md` — Bun runtime, @microsoft/microsoft-graph-client recommendation
- `.planning/PROJECT.md` — Core value: JSON only output, agent-first design
- `.planning/REQUIREMENTS.md` — AUTH-04 multi-account requirement

### Dependencies to add
- `@microsoft/microsoft-graph-client` — Not in package.json, needed for Outlook API

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmailProvider` interface — OutlookProvider implements same abstract class
- `Email`, `Folder`, `SendEmailOptions`, `Attachment` interfaces — already defined
- `GmailProvider` — full implementation reference
- `oauth.ts` — OAuth flow patterns to replicate for Outlook
- keytar integration already in place via `saveTokens()`, `getTokens()`

### Established Patterns
- Provider adapter pattern: `GmailProvider` behind `EmailProvider` interface
- Namespaced ID format: `gmail:ABC123` (per ROADMAP D-01)
- Error codes: `GMAIL_RATE_LIMIT`, `GMAIL_AUTH_ERROR` style → `OUTLOOK_RATE_LIMIT`, `OUTLOOK_AUTH_ERROR`
- JSON output: `console.log(JSON.stringify({...}))`

### Integration Points
- `src/cli.ts` — add `--account` flag to all commands
- `src/auth/` — add Outlook OAuth module (outlook-oauth.ts)
- `src/providers/` — add OutlookProvider
- `package.json` — add @microsoft/microsoft-graph-client dependency

</code_context>

<specifics>
## Specific Ideas

No specific product references — following standard Microsoft Graph API conventions for Outlook integration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 5 scope.

---

*Phase: 05-multi-provider*
*Context gathered: 2026-04-04 via discuss-phase (defaults mode)*
