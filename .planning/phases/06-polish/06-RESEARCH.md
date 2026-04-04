# Phase 6: Polish - Research

**Researched:** 2026-04-04
**Domain:** CLI polish: batch operations, config file, startup optimization, README
**Confidence:** HIGH (decisions locked in CONTEXT.md)

## Summary

Phase 6 is the final v1 polish phase covering four surface-level improvements: batch operations via `--ids` flag (ORG-05), config file with auto-create and env override, removal of `isomorphic-fetch` polyfill in favor of Bun's native fetch, and a comprehensive README for npx distribution. All decisions are already locked in CONTEXT.md; research focuses on implementation specifics and cross-verification.

**Primary recommendation:** Implement batch operations first (ORG-05 is the only new requirement), then config file, then startup optimization, then README. The existing 3-plan wave structure is appropriate.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `--ids 1,2,3` comma-separated flag for `move`, `mark`, `delete` commands
- **D-02:** Partial failure output: `{"ok": true, "failed": [{"id": "2", "error": {"code": "...", "message": "..."}}]}`
- **D-03:** All-or-nothing on success: if no failures, `{"ok": true}` only (no empty results array)
- **D-04:** Config stored at `~/.emailcli/config.json`
- **D-05:** Config file created with empty values if not exists (auto-create on first run)
- **D-06:** Env vars override config file values (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET)
- **D-07:** Config schema: `{ "gmail": { "clientId": "", "clientSecret": "" }, "outlook": { "clientId": "", "clientSecret": "" } }`
- **D-08:** README.md with quick-start: `npx @laffy1309/emailcli account add --provider gmail`, basic commands, config file setup
- **D-09:** Package name: `@laffy1309/emailcli` on npm
- **D-10:** Measure startup time with `bun --bun-entry` build; target under 200ms
- **D-11:** Replace `isomorphic-fetch` with native `Bun.fetch` in cli.ts (no polyfill needed with Bun)
- **D-12:** Verify `errors.ts` error envelope: `{"error": {"code": "...", "message": "...", "details": ...}}` — already in place

### Claude's Discretion
- Exact bundle optimization approach (lazy loading providers only if startup exceeds 200ms)
- man page vs README-only decision (README sufficient for npx distribution)
- --help output format via Commander.js (built-in is sufficient)

### Deferred Ideas (OUT OF SCOPE)
- man page generation — README + npx is sufficient for V1
- Lazy provider loading for startup optimization — only if measurement shows >200ms startup

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORG-05 | Batch operations (--ids flag for bulk mark/move/trash) | Batch pattern documented below; D-01, D-02, D-03 define exact output format |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.3.10 | Runtime | Required per CLAUDE.md |
| commander | 14.0.3 | CLI parsing | Already in project |
| Bun.file / Bun.write | native | Config file I/O | Native Bun API per CLAUDE.md |
| Bun.build | native | Binary builds | Native Bun API per CLAUDE.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| isomorphic-fetch | 3.0.0 | Fetch polyfill | **To be removed** - not needed with Bun |
| keytar | 7.9.0 | Credential storage | Already in project |
| googleapis | 171.4.0 | Gmail API | Already in project |
| @microsoft/microsoft-graph-client | 3.0.7 | Outlook API | Already in project |

**Installation changes needed:**
```bash
# Remove (not needed with Bun):
# npm uninstall isomorphic-fetch

# Config file uses native Bun APIs - no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.ts              # Main CLI entry, all commands
├── utils/
│   ├── errors.ts       # CLIError class, printError (already done)
│   ├── config.ts      # NEW: loadConfig, Config interface, auto-create
│   └── index.ts       # Re-exports (add loadConfig)
├── providers/
│   ├── email-provider.ts  # Abstract interface
│   ├── gmail-provider.ts # Gmail implementation
│   └── outlook-provider.ts # Outlook implementation
├── auth/
│   ├── index.ts       # Auth exports
│   ├── oauth.ts       # Gmail OAuth
│   └── outlook-oauth.ts # Outlook OAuth (has isomorphic-fetch import)
└── email/
    ├── parser.ts      # Email parsing
    └── composer.ts    # MIME construction
```

### Pattern 1: Batch Operations with Partial Failure

**What:** Iterate over comma-separated IDs, call provider methods individually, track failures.

**When to use:** mark, move, delete commands with `--ids` flag.

**Implementation approach (from 06-02-PLAN.md):**
```typescript
// Parse --ids into array
const ids: string[] = options.ids
  ? options.ids.split(",").map((s: string) => s.trim()).filter(Boolean)
  : id ? [id] : throw CLIError;

// Batch loop with failure tracking
const failed: Array<{id: string; error: {code: string; message: string}}> = [];
for (const emailId of ids) {
  try {
    await provider.mark(emailId, isRead);
  } catch (err) {
    if (err instanceof CLIError) {
      failed.push({ id: emailId, error: { code: err.code, message: err.message } });
    } else {
      failed.push({ id: emailId, error: { code: "UNKNOWN", message: (err as Error).message } });
    }
  }
}

// Output per D-02, D-03
if (failed.length === 0) {
  console.log(JSON.stringify({ ok: true }));
} else {
  console.log(JSON.stringify({ ok: true, failed }));
}
```

### Pattern 2: Config File with Env Override

**What:** Load JSON config from `~/.emailcli/config.json`, auto-create if missing, allow env vars to override.

**Implementation approach (from 06-01-PLAN.md):**
```typescript
import { homedir } from "node:os";
import { join } from "node:path";

interface Config {
  gmail: { clientId: string; clientSecret: string };
  outlook: { clientId: string; clientSecret: string };
}

function getConfigPath(): string {
  return join(homedir(), ".emailcli", "config.json");
}

async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();
  const file = Bun.file(configPath);

  // Auto-create if missing (D-05)
  if (!(await file.exists())) {
    const defaultConfig: Config = {
      gmail: { clientId: "", clientSecret: "" },
      outlook: { clientId: "", clientSecret: "" },
    };
    await Bun.write(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  // Read and parse existing config
  const content = await file.text();
  const config: Config = JSON.parse(content);

  // Apply env overrides (D-06)
  if (process.env.GMAIL_CLIENT_ID) config.gmail.clientId = process.env.GMAIL_CLIENT_ID;
  if (process.env.GMAIL_CLIENT_SECRET) config.gmail.clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (process.env.OUTLOOK_CLIENT_ID) config.outlook.clientId = process.env.OUTLOOK_CLIENT_ID;
  if (process.env.OUTLOOK_CLIENT_SECRET) config.outlook.clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

  return config;
}
```

### Pattern 3: Bun-native Fetch Replacement

**What:** Remove `isomorphic-fetch` imports; Bun has native global `fetch`.

**Files affected:**
- `src/cli.ts` line 2: `import "isomorphic-fetch";` - D-11 says remove this
- `src/auth/outlook-oauth.ts` line 1: `import "isomorphic-fetch";` - also uses fetch at line 143
- `src/providers/outlook-provider.ts` line 1: `import "isomorphic-fetch";` - but no direct fetch usage

**Verification:** `googleapis@171` uses native fetch internally per CLAUDE.md. The `@microsoft/microsoft-graph-client` uses its own HTTP layer. The `fetch` calls in cli.ts and outlook-oauth.ts (line 143, 164) will work with Bun's native fetch.

### Anti-Patterns to Avoid
- **Don't use `fs` module** for config: Bun.file() is the standard per CLAUDE.md
- **Don't use `dotenv`**: Bun auto-loads .env per CLAUDE.md
- **Don't output empty `failed: []`** when all succeed (D-03): only output `failed` key when there are actual failures
- **Don't remove isomorphic-fetch from package.json entirely** without checking dependent packages (outlook-provider.ts still imports it)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file creation | Custom file creation logic | `Bun.write()` with atomic write | Bun native, simpler |
| Path resolution | Hardcoded paths | `os.homedir()` + `path.join()` | Cross-platform |
| Batch operation tracking | Custom partial-failure aggregation | Simple array + loop pattern | Already well-specified |
| Fetch polyfill | isomorphic-fetch | Native `fetch` | Bun has built-in fetch |

## Common Pitfalls

### Pitfall 1: Config directory not created before file write
**What goes wrong:** `Bun.write()` to `~/.emailcli/config.json` fails if `~/.emailcli/` directory does not exist.
**Why it happens:** `Bun.write()` does not auto-create parent directories.
**How to avoid:** Ensure directory exists with `Bun.mkdir()` with `{ recursive: true }` before first write.
**Warning signs:** `Bun.write` throws error on first run.

### Pitfall 2: JSON parse error on malformed config
**What goes wrong:** If config file exists but is empty or malformed, `JSON.parse()` throws.
**Why it happens:** No error handling around config file read.
**How to avoid:** Wrap config read in try-catch, fall back to default config on parse error.
**Warning signs:** CLI crashes on startup if user manually edits config incorrectly.

### Pitfall 3: TypeScript argument mismatch in batch commands
**What goes wrong:** Changing `<id>` argument to `[id]` (optional) may cause TypeScript errors if the handler expects a non-optional string.
**Why it happens:** Commander.js `action` callback type changes when argument is made optional.
**How to avoid:** Explicitly check `if (!options.ids && !id)` for required ID.
**Warning signs:** `Argument 'id' is declared as optional but function expects non-optional`.

## Code Examples

### Commander.js optional argument with --ids fallback
```typescript
// Mark command: argument becomes optional when --ids is provided
.command("mark")
.argument("[id]", "Email ID (use --ids for batch)")
.option("--ids <list>", "Comma-separated list of email IDs")
.action(async (id, options) => {
  if (!options.ids && !id) {
    throw new CLIError("MISSING_ID", "Either <id> or --ids is required");
  }
  // ... batch logic
});
```

### Bun.file() existence check and JSON read
```typescript
const file = Bun.file(configPath);
if (!(await file.exists())) {
  // create with default
}
const content = await file.text();
const config = JSON.parse(content);
```

### Startup time measurement command
```bash
# Build first
bun build ./src/cli.ts --outdir ./dist --target node --format esm

# Measure startup (multiple runs for consistency)
for i in 1 2 3; do time node ./dist/cli.js --version 2>&1; done
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import "isomorphic-fetch"` | Native `fetch` | Phase 6 (this phase) | Reduced dependencies, faster startup |
| No config file | `~/.emailcli/config.json` | Phase 6 (this phase) | Persistent credentials without env vars |
| Single ID operations only | `--ids` batch support | Phase 6 (this phase) | ORG-05 requirement |

**Deprecated/outdated:**
- `isomorphic-fetch`: No longer needed with Bun runtime (D-11)

## Open Questions

1. **Should `isomorphic-fetch` be removed from outlook-oauth.ts and outlook-provider.ts too?**
   - What we know: D-11 only mentions cli.ts; plan 06-03 only covers cli.ts
   - What's unclear: outlook-oauth.ts and outlook-provider.ts also import it
   - Recommendation: Remove from all three files for consistency - Bun's native fetch is available globally

2. **Should config loading be lazy or eager?**
   - What we know: config is needed for OAuth client credentials
   - What's unclear: Whether to load on startup or only when needed
   - Recommendation: Load on first use (lazy) to keep startup fast

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified - this phase modifies existing code, no new tools needed)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | YES | 1.3.10 | N/A |
| bun test | Testing | YES | native | N/A |
| bun build | Build | YES | native | N/A |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun test (per CLAUDE.md) |
| Config file | bun test.cfg.ts or bun.toml if needed |
| Quick run command | `bun test src/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---------|----------|-----------|-------------------|-------------|
| ORG-05 | mark --ids batch | unit | `bun test src/cli.test.ts` | NO - needs new test |
| ORG-05 | move --ids batch | unit | `bun test src/cli.test.ts` | NO - needs new test |
| ORG-05 | delete --ids batch | unit | `bun test src/cli.test.ts` | NO - needs new test |
| D-02 | partial failure output | unit | `bun test src/cli.test.ts` | NO - needs new test |
| D-04 | config auto-create | unit | `bun test src/utils/config.test.ts` | NO - needs new test |
| D-06 | env override config | unit | `bun test src/utils/config.test.ts` | NO - needs new test |

### Sampling Rate
- **Per task commit:** `bun test src/` (fast subset)
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/cli.test.ts` — covers ORG-05 batch operations (mark, move, delete with --ids)
- [ ] `src/utils/config.test.ts` — covers loadConfig auto-create and env override
- [ ] Existing test files: `src/providers/gmail-provider.test.ts`, `src/email/parser.test.ts`, `src/email/composer.test.ts` - these exist and should continue to pass

## Sources

### Primary (HIGH confidence)
- 06-CONTEXT.md — Locked decisions D-01 through D-12
- src/cli.ts — Existing CLI structure, all commands
- src/providers/email-provider.ts — Provider interface
- src/utils/errors.ts — Error envelope already implemented

### Secondary (MEDIUM confidence)
- CLAUDE.md — Bun runtime conventions, native APIs
- package.json — Current dependencies, version info
- 06-01-PLAN.md, 06-02-PLAN.md, 06-03-PLAN.md — Detailed implementation specs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all decisions locked, codebase patterns clear
- Architecture: HIGH - patterns documented with exact code from plans
- Pitfalls: MEDIUM - identified from implementation experience, not verified

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days, stable phase domain)
