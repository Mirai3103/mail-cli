
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**mail-cli**

A fast, interactive command-line email client designed for automation and AI agent workflows. Users and agents interact entirely through command-line flags — no interactive prompts, no TUI. Targets Gmail first, Outlook second, with a unified command interface that abstracts provider differences behind a consistent JSON output schema.

**Core Value:** A developer tool that lets you read, compose, search, and manage email from any terminal without leaving your workflow. Zero friction — every action is a single command with flags.

### Constraints

- **Runtime**: Bun (not Node) — per project CLAUDE.md defaults
- **APIs**: Gmail API / Microsoft Graph only — no IMAP
- **Auth**: OAuth2 browser flow — no app passwords or env vars
- **Output**: JSON only — no human-prettified output modes
- **Concurrency**: Online-only — no offline queue or sync
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
# Core dependencies (already in package.json)
# Dev dependencies (already in package.json)
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
- Use googleapis exclusively
- Simplifies OAuth2 flow (single provider)
- Use googleapis for Gmail
- Use @microsoft/microsoft-graph-client for Outlook
- Abstract provider differences behind a unified interface (per PROJECT.md requirements)
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
## Sources
- bun-types documentation (local, verified) — Bun native APIs, secrets, shell
- package.json (verified) — Current project dependencies
- Training data (NOT verified) — googleapis, commander, keytar version recommendations
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
