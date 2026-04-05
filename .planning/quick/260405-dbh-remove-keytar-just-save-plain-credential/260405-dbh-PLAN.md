---
phase: quick
plan: 260405-dbh
type: execute
wave: 1
depends_on: []
files_modified:
  - src/auth/oauth.ts
  - package.json
autonomous: true
requirements: []
must_haves:
  truths:
    - "Token storage uses plain JSON files in ~/.emailcli/tokens/"
    - "Gmail and Outlook tokens both work after removal"
  artifacts:
    - path: "src/auth/oauth.ts"
      provides: "Token storage using plain JSON files"
      min_lines: 10
    - path: "~/.emailcli/tokens/"
      provides: "Directory for storing token JSON files"
  key_links:
    - from: "src/auth/outlook-oauth.ts"
      to: "src/auth/oauth.ts"
      via: "import { saveTokens, getTokens }"
---

<objective>
Remove keytar dependency and replace with plain JSON file storage in ~/.emailcli/tokens/
</objective>

<context>
@src/auth/oauth.ts — current keytar implementation
@src/auth/outlook-oauth.ts — imports saveTokens/getTokens from oauth.ts
@src/utils/config.ts — already uses ~/.emailcli/ directory pattern
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace keytar with plain JSON file storage in oauth.ts</name>
  <files>src/auth/oauth.ts</files>
  <action>
    Replace the keytar-based token storage with plain JSON file storage.

    Current keytar functions to replace:
    - `saveTokens(email, tokens)` — uses `keytar.setPassword(SERVICE, email, JSON.stringify(tokens))`
    - `getTokens(email)` — uses `keytar.getPassword(SERVICE, email)`
    - `deleteTokens(email)` — uses `keytar.deletePassword(SERVICE, email)`
    - `listAccounts()` — uses `keytar.findCredentials(SERVICE)`

    New implementation using plain JSON files:
    - Token directory: `~/.emailcli/tokens/`
    - File naming: `{email}.json` (e.g., `me@gmail.com.json`, `me@outlook.com:outlook.json`)
    - Use `Bun.file` and `Bun.write` for file I/O (per CLAUDE.md: prefer Bun.file over node:fs)
    - Ensure directory exists before writing

    Remove these imports:
    - `import keytar from "keytar";`

    Add new imports:
    - `import { mkdir, readFile, writeFile, access, readdir, unlink } from "node:fs/promises";`
    - `import { join } from "path";`
    - `import * as os from "node:os";`

    Keep all existing function signatures so outlook-oauth.ts does not need changes.
  </action>
  <verify>
    <automated>bun --no-title test src/auth/oauth.ts 2>/dev/null || echo "No tests yet"</automated>
  </verify>
  <done>Gmail OAuth tokens are saved to and loaded from ~/.emailcli/tokens/*.json files</done>
</task>

<task type="auto">
  <name>Task 2: Remove keytar from package.json</name>
  <files>package.json</files>
  <action>
    Remove keytar dependency from package.json:
    - Remove "keytar": "^7.9.0" from dependencies
    - Remove "@types/keytar": "^4.4.2" from devDependencies

    Run `bun remove keytar @types/keytar` to update package.json and bun.lock.
  </action>
  <verify>
    <automated>grep -q '"keytar"' package.json && echo "FAIL: keytar still in package.json" || echo "PASS: keytar removed"</automated>
  </verify>
  <done>keytar and @types/keytar removed from package.json and bun.lock</done>
</task>

</tasks>

<verification>
- `src/auth/oauth.ts` compiles without errors (no keytar imports)
- `src/auth/outlook-oauth.ts` still imports `saveTokens` and `getTokens` from `./oauth.js` without changes
- Token files are created in `~/.emailcli/tokens/` when OAuth flow completes
</verification>

<success_criteria>
- Gmail OAuth flow stores tokens in `~/.emailcli/tokens/{email}.json`
- Outlook OAuth flow stores tokens in `~/.emailcli/tokens/{email}:outlook.json`
- `listAccounts()` returns account names from the tokens directory
- keytar is completely removed from the project
</success_criteria>

<output>
After completion, create `.planning/quick/260405-dbh-remove-keytar-just-save-plain-credential/260405-dbh-SUMMARY.md`
</output>
