# Phase 6: Polish - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish phase covers v1 completion: batch operations (--ids flag), structured error output verification, startup performance optimization, and README/distribution.

</domain>

<decisions>
## Implementation Decisions

### Batch API Design
- **D-01:** `--ids 1,2,3` comma-separated flag for `move`, `mark`, `delete` commands
- **D-02:** Partial failure output: `{"ok": true, "failed": [{"id": "2", "error": {"code": "...", "message": "..."}}]}` — succeeds with list of failed items
- **D-03:** All-or-nothing on success: if no failures, `{"ok": true}` only (no empty results array)

### Config File Approach
- **D-04:** Config stored at `~/.emailcli/config.json`
- **D-05:** Config file created with empty values if not exists (auto-create on first run)
- **D-06:** Env vars override config file values (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET)
- **D-07:** Config schema: `{ "gmail": { "clientId": "", "clientSecret": "" }, "outlook": { "clientId": "", "clientSecret": "" } }`

### README / Distribution
- **D-08:** README.md with quick-start: `npx @laffy1309/emailcli account add --provider gmail`, basic commands, config file setup
- **D-09:** Package name: `@laffy1309/emailcli` on npm

### Performance
- **D-10:** Measure startup time with `bun --bun-entry` build; target under 200ms
- **D-11:** Replace `isomorphic-fetch` with native `Bun.fetch` in cli.ts (no polyfill needed with Bun)

### Structured Errors (already implemented)
- **D-12:** Verify `errors.ts` error envelope: `{"error": {"code": "...", "message": "...", "details": ...}}` — already in place

### Claude's Discretion
- Exact bundle optimization approach (lazy loading providers only if startup exceeds 200ms)
- man page vs README-only decision (README sufficient for npx distribution)
- --help output format via Commander.js (built-in is sufficient)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `src/cli.ts` — Existing CLI structure, all commands
- `src/utils/errors.ts` — Existing error envelope structure
- `src/providers/email-provider.ts` — Provider interface that batch operations must respect
- `.planning/ROADMAP.md` §Phase 6 — Success criteria: batch --ids, error envelope, startup <200ms

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `CLIError` class already has `toJSON()` producing `{"error": {"code": ..., "message": ...}}`
- `printError()` already handles error output consistently
- `GmailProvider`, `OutlookProvider` already implement `EmailProvider` interface

### Established Patterns
- Commander.js for CLI argument parsing — `--ids` as custom option
- JSON-only output — all commands return JSON
- Provider interface: `list()`, `mark()`, `move()`, `delete()` — batch operations call these per-ID

### Integration Points
- Batch commands in cli.ts call existing provider methods in a loop
- Config loading at startup in cli.ts or a new `src/config.ts`
- `isomorphic-fetch` import at top of cli.ts → replace with Bun native fetch

</codebase_context>

<specifics>
## Specific Ideas

- Config auto-create: `~/.emailcli/config.json` with empty clientId/clientSecret values if file doesn't exist
- Env override: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`
- npx distribution: `npx @laffy1309/emailcli` — README should document this

</specifics>

<deferred>
## Deferred Ideas

- man page generation — README + npx is sufficient for V1; man page can be future phase
- Lazy provider loading for startup optimization — only if measurement shows >200ms startup

</deferred>

---

*Phase: 06-polish*
*Context gathered: 2026-04-04*
