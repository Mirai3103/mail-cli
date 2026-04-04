# Stack Research

**Domain:** CLI Email Client (Bun + TypeScript)
**Researched:** 2026-04-04
**Confidence:** LOW (web search disabled - versions verified against package.json, not live sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bun | 1.x (latest) | Runtime | Required per project CLAUDE.md. Native secrets API, fast startup, TypeScript-first |
| TypeScript | ^6.0.2 | Language | Required per project CLAUDE.md. Strict mode already configured in tsconfig |
| googleapis | ^171.4.0 | Gmail API client | Official Google library. Handles OAuth2, batching, pagination automatically |
| @microsoft/microsoft-graph-client | ^3.x | Microsoft Graph API | Official Microsoft library for Outlook/Graph API integration |
| commander | ^14.0.3 | CLI argument parsing | Already in package.json. Industry standard for Node CLI tools with TypeScript support |
| ora | ^9.3.0 | Terminal spinners | Already in package.json. Lightweight, configurable spinner for loading states |
| picocolors | ^1.1.1 | Terminal colors | Already in package.json. Fast, zero-dependency color library |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| keytar | ^7.9.0 | Secure credential storage | **Pre-Bun.secrets**: Store OAuth tokens in OS keychain (macOS Keychain, Linux libsecret, Windows Credential Manager) |
| nodemailer | ^7.x | Email message construction | Composing emails with attachments, MIME encoding |
| mailparser | ^3.x | Email parsing | Parsing received email (headers, bodies, attachments) for display |
| open | ^10.x | Open browser for OAuth | Launch OAuth flow in user's default browser |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| bun test | Testing | Per CLAUDE.md - do not use jest/vitest |
| @types/bun | TypeScript types | Already in devDependencies |
| bun --bun-entry | Binary builds | For CLI executable builds |

## Installation

```bash
# Core dependencies (already in package.json)
bun add googleapis @microsoft/microsoft-graph-client commander ora picocolors keytar nodemailer mailparser open

# Dev dependencies (already in package.json)
bun add -D @types/bun @types/node @types/keytar
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|------------------------|
| googleapis | @googleapis/gmail (individual API packages) | Only if you need tree-shaking; googleapis is more maintainable |
| commander | yargs, oclif | oclif if you need plugin architecture; yargs if you prefer fluent API |
| keytar | Bun.secrets (native) | Bun.secrets is experimental but may replace keytar in future |
| ora | cli-spinners, signale | ora is already in package.json and sufficient |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| express | Not a web server; CLI doesn't need it | N/A |
| better-sqlite3 | Bun has native bun:sqlite | bun:sqlite |
| ioredis | Bun has native Bun.redis | Bun.redis |
| pg / postgres.js | Bun has native Bun.sql | Bun.sql |
| ws | Bun has native WebSocket | Built-in WebSocket |
| node-fetch / axios | Bun has native fetch | Built-in fetch |
| dotenv | Bun auto-loads .env | N/A |
| jest / vitest | Per CLAUDE.md | bun test |
| execa / shelljs | Bun has native `$` shell | Bun.$ |
| node:fs readFile/writeFile | Bun has optimized Bun.file | Bun.file, Bun.write |

## Stack Patterns by Variant

**If Gmail-only:**
- Use googleapis exclusively
- Simplifies OAuth2 flow (single provider)

**If Gmail + Outlook (unified):**
- Use googleapis for Gmail
- Use @microsoft/microsoft-graph-client for Outlook
- Abstract provider differences behind a unified interface (per PROJECT.md requirements)

**If Bun.secrets stabilizes:**
- Consider migrating from keytar to Bun.secrets for reduced native dependency footprint
- Currently experimental - may not be suitable for production

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| googleapis@171 | Bun 1.x, Node 18+ | Uses native fetch internally |
| commander@14 | Bun 1.x, Node 16+ | ESM-first |
| keytar@7 | Bun 1.x | Native module - may require rebuild with Bun |
| ora@9 | Bun 1.x | Pure JavaScript |

## Native Bun APIs to Leverage

Per bun-types documentation:

```typescript
// Secure credential storage (experimental)
import { secrets } from "bun";
await secrets.set({ service: "mail-cli", name: "gmail-token", value: token });
const token = await secrets.get({ service: "mail-cli", name: "gmail-token" });

// Shell operations
import { $ } from "bun";
await $`open https://accounts.google.com/o/oauth2/v2/auth`;

// File I/O
import { file } from "bun";
const content = await file("attachment.txt").text();

// Environment
// Bun auto-loads .env - no dotenv needed
const apiKey = Bun.env.API_KEY;
```

## Sources

- bun-types documentation (local, verified) — Bun native APIs, secrets, shell
- package.json (verified) — Current project dependencies
- Training data (NOT verified) — googleapis, commander, keytar version recommendations

---

*Stack research for: CLI Email Client*
*Researched: 2026-04-04*
