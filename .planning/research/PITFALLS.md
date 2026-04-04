# Domain Pitfalls: CLI Email Client

**Project:** mail-cli
**Researched:** 2026-04-04
**Confidence:** MEDIUM (based on domain knowledge, not live verification)

> **Note:** WebSearch was unavailable during research. Findings are based on training knowledge of CLI tools, Gmail API, and Microsoft Graph API. Claims should be verified against official docs before treating as authoritative.

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or broken production use.

### Pitfall 1: Token Storage in Plain Text

**What goes wrong:** OAuth refresh tokens stored in config files, environment variables, or localStorage-equivalents get committed to git or read by other processes.

**Why it happens:** Developers prioritize "it works" over "it's secure" during initial development. The temptation to store tokens in `~/.config/mail-cli.json` is high.

**Consequences:**
- Compromised account access if repo is public or device is shared
- Full account takeover since refresh tokens are powerful
- User distrust of the tool

**Prevention:**
- Store tokens in OS keychain (Keychain on macOS, libsecret on Linux, Credential Manager on Windows)
- Never log tokens, even at debug level
- Add `*.token.json` and `*.refresh` to global gitignore pattern
- Consider using OS-native credential storage APIs

**Warning signs:**
- `grep -r "token" config/` shows raw tokens
- `.gitignore` missing token file patterns
- No encryption at rest for stored credentials

**Phase:** Auth implementation (Phase 2 likely)

---

### Pitfall 2: Gmail API Rate Limit Blindness

**What goes wrong:** Requests fail silently or with opaque errors when hitting Gmail API quotas. Daily limits (1,000,000,000/day), per-second limits (250-1000/sec depending on scope), and per-user limits (250/sec) are not handled.

**Why it happens:** Gmail API docs show limits but don't emphasize exponential backoff requirements. Developers assume "it's just API calls."

**Consequences:**
- Bulk operations (sync, search) fail halfway through
- "Quota exceeded" errors that block the user at worst possible time
- Data inconsistency if partial operations commit

**Prevention:**
- Implement exponential backoff with jitter from day one
- Track request counts and respect per-second limits
- Batch operations where possible (Gmail batch API)
- Add `--dry-run` flag for bulk operations to estimate quota cost

**Warning signs:**
- Single `messages.list` call processes thousands without throttling
- No retry logic with backoff in HTTP client
- Missing `X-Retry-After` header handling

**Phase:** API integration layer (Phase 3 likely)

---

### Pitfall 3: Incomplete Email Parsing (HTML/UTF-8/Attachments)

**What goes wrong:** Email body displayed as raw HTML, garbled UTF-8 characters, or missing attachments. Only simple ASCII plain-text emails work correctly.

**Why it happens:** Email is a 50-year-old format with insane edge cases. MIME multipart, Content-Transfer-Encoding, charset hell, and inline attachments are complex.

**Consequences:**
- Professional emails display as garbage
- Attachments silently lost
- Reply/forward breaks threading
- International users see broken text

**Prevention:**
- Use a battle-tested email parsing library (not regex)
- Handle `text/plain` and `text/html` with proper charset detection
- Parse MIME multipart recursively
- Extract attachments with correct MIME type and filename encoding
- Test with real emails from various clients (Gmail web, Outlook, Apple Mail, Thunderbird)

**Warning signs:**
- `Content-Type` header is ignored in your parsing
- No MIME multipart handling
- Hardcoded `UTF-8` assumption

**Phase:** Email reading feature (Phase 3 or 4 likely)

---

### Pitfall 4: OAuth2 Redirect URI Misconfiguration

**What goes wrong:** Authorization works in dev but fails in production because redirect URI is `http://localhost:3000/callback` and never updated to production URL.

**Why it happens:** Google's OAuth consent screen requires URI pre-registration. Developers forget to add production URIs, or test URIs get blocked.

**Consequences:**
- Users cannot authenticate in production
- "redirect_uri_mismatch" error with no clear fix for users
- Broken auth blocks entire product

**Prevention:**
- Document required redirect URIs clearly:
  - `http://localhost:3000/callback` (local dev)
  - `https://yourdomain.com/auth/callback` (production)
  - `urn:ietf:wg:oauth:2.0:oob` (headless/cli alternative)
- Use OOB flow (`urn:ietf:wg:oauth:2.0:oob`) for pure CLI tools to avoid web server requirement
- Store OAuth state in filesystem, not memory, for CLI flow

**Warning signs:**
- No OOB fallback for headless auth
- Redirect URI not documented in setup instructions
- Only `localhost` URI registered in Google Cloud Console

**Phase:** Auth implementation (Phase 2 likely)

---

### Pitfall 5: Threading Header Mismanagement (References/In-Reply-To)

**What goes wrong:** Replies appear as new threads, or sent messages don't thread correctly in Gmail/Outlook. In-Reply-To and References headers are set incorrectly.

**Why it happens:** Email threading is subtle. Gmail uses both headers plus Subject line. Wrong header = broken conversation view.

**Consequences:**
- Replies appear as new conversations
- Users lose context
- Email chains split across multiple threads
- "Re:" Subject line manipulation doesn't save bad headers

**Prevention:**
- Always set `In-Reply-To` to the original Message-ID
- Always set `References` to original References + original Message-ID (max 998 bytes per RFC 5322)
- Preserve Subject line with "Re: " prefix (don't add if already present)
- Store Message-ID from received emails to enable correct reply threading

**Warning signs:**
- New messages don't appear under the correct thread in Gmail
- Sent messages create new conversations
- No Message-ID storage from fetched emails

**Phase:** Compose/Reply feature (Phase 4 likely)

---

## Moderate Pitfalls

Issues that cause confusion, moderate bugs, or degraded UX.

### Pitfall 6: Gmail Search Syntax Not Abstracted (Vendor Lock-in Commands)

**What goes wrong:** Commands like `mail-cli search "has:attachment is:unread"` work for Gmail but are meaningless for Outlook. Users cannot write portable scripts.

**Why it happens:** Gmail search syntax is powerful and well-documented. Outlook Graph API uses OData filters (`filter=isRead eq false`). Developers use Gmail syntax as default.

**Consequences:**
- Scripts break when switching providers
- Agents must know provider-specific syntax
- Cannot offer "same commands, any provider" promise

**Prevention:**
- Implement a query abstraction layer that translates to provider-native syntax
- Document that raw search strings use provider syntax
- Provide high-level filter flags (`--attachment`, `--unread`, `--from`, `--to`, `--date-after`) that work universally
- Let advanced users opt into raw provider syntax with `--provider-syntax`

**Warning signs:**
- `search` command only accepts raw Gmail syntax
- No `--from`, `--to`, `--since` flags that abstract provider
- Graph API `$filter` never mentioned

**Phase:** Search feature (Phase 3 likely)

---

### Pitfall 7: Missing Pagination Handling

**What goes wrong:** Inbox lists only 10-25 emails even when user has thousands. Bulk operations process only first page.

**Why it happens:** APIs return paginated results by default. Developers test with small mailboxes and miss pagination entirely.

**Consequences:**
- Users think their email is missing
- Bulk operations incomplete
- "Last email" is actually email #25

**Prevention:**
- Always handle `nextPageToken` (Gmail) or `@odata.nextLink` (Graph)
- Add `--limit` flag so users control scope
- Default to reasonable limit (50) but document how to get more
- Warn when results are truncated

**Warning signs:**
- No page token handling in list code
- Hardcoded `maxResults=25` or similar
- No way for user to get "next page"

**Phase:** All list operations (Phase 3 likely)

---

### Pitfall 8: Not Handling Message ID Collisions Across Providers

**What goes wrong:** A message gets ID "ABC123" from Gmail and ID "XYZ789" from Graph. If user adds both accounts, ID collisions cause wrong email display.

**Why it happens:** Each provider uses its own ID format and namespace. No collision prevention.

**Consequences:**
- Wrong email shown when switching between accounts
- Thread linking breaks across providers
- Attachment retrieval fails for wrong account

**Prevention:**
- Namespace IDs by provider: `gmail:ABC123`, `outlook:XYZ789`
- Use composite keys in any local storage
- When displaying IDs to users, show provider prefix
- Document this in schema if any data is persisted

**Phase:** Account management (Phase 2 likely)

---

### Pitfall 9: Missing Content-Disposition Handling for Attachments

**What goes wrong:** Attachments download with wrong filenames (e.g., "attachment.bin" or "part1.2") or wrong MIME types.

**Why it happens:** `Content-Disposition: inline` vs `attachment`, and filename encoding (RFC 2231/5987) are often ignored.

**Consequences:**
- Users cannot find their downloads
- Files open in browser instead of downloading
- Wrong file associations

**Prevention:**
- Respect `Content-Disposition: attachment; filename="..."`
- Decode RFC 2231/5987 encoded filenames
- Fall back to MIME part filename if no Content-Disposition
- Sanitize filenames for filesystem safety

**Phase:** Attachment handling (Phase 4 likely)

---

### Pitfall 10: No Timeout or Hang Protection

**What goes wrong:** Commands hang forever when network is down, API is slow, or server is unresponsive. Users must Ctrl+C.

**Why it happens:** Default HTTP client timeouts are often disabled or too long. Network errors not handled gracefully.

**Consequences:**
- Scripted workflows stall indefinitely
- Users assume tool is broken
- Resource exhaustion from many hanging connections

**Prevention:**
- Set reasonable timeouts: 10s for single operations, 60s for bulk
- Implement per-request timeouts, not global timeouts
- Add `--timeout` flag for user control
- Provide `--poll-interval` for long-running operations
- Handle network errors with clear messages, not raw stack traces

**Phase:** HTTP client / error handling (Phase 2 or 3)

---

## Minor Pitfalls

Issues that cause friction but are recoverable.

### Pitfall 11: JSON Output Without Error Channel

**What goes wrong:** Successful commands return JSON, but errors return human-readable text to stderr. Parsing scripts cannot distinguish success from failure cleanly.

**Why it happens:** Developers output errors as human messages without thinking about machine parsing.

**Consequences:**
- Scripts cannot detect failures from output alone
- `mail-cli list | jq .` fails on error but jq doesn't know why
- Exit codes sometimes wrong

**Prevention:**
- Always output errors as JSON to stdout: `{"error": "...", "code": "RATE_LIMITED"}`
- Use exit codes consistently: 0 success, 1 usage error, 2 server error, 3 auth error
- Consider `{"ok": true, "data": [...]}` vs `{"ok": false, "error": "..."}` envelope pattern

**Phase:** Output/CLI interface (Phase 1 or 2)

---

### Pitfall 12: Startup Time Neglect (The Bun Check)

**What goes wrong:** Tool takes 800ms+ to start because of unnecessary imports, synchronous file reads, or heavy initialization. Users expect sub-200ms.

**Why it happens:** Bun's startup is fast, but developers import heavy modules or do synchronous I/O at startup anyway.

**Consequences:**
- Not "fast" anymore
- Breaks scripts expecting snappy output
- Annoying for daily driver use

**Prevention:**
- Lazy-load non-critical modules
- Async initialization where possible
- Profile startup: `bun build --profile` or `time bun index.ts`
- Target <100ms cold start, <20ms warm (if caching auth)

**Phase:** Performance optimization (Phase N, after MVP)

---

### Pitfall 13: Large Attachment Download in Memory

**What goes wrong:** 50MB attachment loads entirely into RAM before writing to disk, causing memory bloat or OOM on large files.

**Why it happens:** Simple `response.arrayBuffer()` followed by `writeFile` loads everything first.

**Consequences:**
- Memory exhaustion on large files
- Slow feedback (no progress until complete)
- Cannot handle multi-GB files

**Prevention:**
- Stream attachments: fetch body as ReadableStream, pipe to file
- Show download progress for files >1MB
- Support `--output-dir` for attachment saves
- Set reasonable max attachment size warning (e.g., >25MB)

**Phase:** Attachment handling (Phase 4 likely)

---

### Pitfall 14: Ignoring Email Security Headers (DMARC/DKIM/SPF Context)

**What goes wrong:** Tool displays emails identically regardless of authentication status. Users cannot see if an email is actually from who it claims.

**Why it happens:** DMARC/DKIM/SPF validation is complex. Most tools just show "From:" header without verification status.

**Consequences:**
- Phishing emails appear legitimate
- Users cannot distinguish forged from genuine
- Security-conscious users distrust the tool

**Prevention:**
- At minimum, surface authentication results if provided by API (Gmail provides `GNIP` or security details)
- Consider showing a warning badge for unauthenticated emails
- Document what authentication signals the tool shows (and doesn't show)

**Phase:** Email display (Phase 3 or 4)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| OAuth2 / Auth | Pitfall 1 (token storage), Pitfall 4 (redirect URI) | Keychain storage, OOB fallback, documented URIs |
| API Integration | Pitfall 2 (rate limits), Pitfall 7 (pagination) | Exponential backoff, page token handling |
| Search | Pitfall 6 (Gmail-only syntax) | Query abstraction layer from day one |
| Email Display | Pitfall 3 (parsing), Pitfall 14 (security headers) | Battle-tested parser, authentication surfacing |
| Attachments | Pitfall 9 (filename), Pitfall 13 (streaming) | RFC 2231 decode, streaming downloads |
| Compose/Reply | Pitfall 5 (threading headers) | In-Reply-To/References as first-class concern |
| Output/CLI | Pitfall 11 (error channel) | JSON error envelope from day one |
| Performance | Pitfall 12 (startup time) | Lazy loading, profiling, <100ms target |

---

## Sources

> **Confidence: LOW** — Not verified via live search. Based on training data up to early 2025.

- Gmail API Quotas: https://developers.google.com/gmail/api/reference/quota (verify current limits)
- Gmail API Best Practices: https://developers.google.com/gmail/api/guides/bestbuy (verify current recommendations)
- Microsoft Graph Throttling: https://learn.microsoft.com/en-us/graph/throttling (verify current limits)
- RFC 5322 (Email format): https://datatracker.ietf.org/doc/html/rfc5322
- RFC 2231 (MIME parameter encoding): https://datatracker.ietf.org/doc/html/rfc2231
- OAuth 2.0 for CLI: https://developers.google.com/identity/protocols/oauth2#installed (verify OOB still supported)
- Email threading: https://www.jwz.org/doc/threading.html

---

## Verification Checklist

Before treating this document as authoritative, verify:

- [ ] Gmail API rate limits with current documentation
- [ ] Microsoft Graph throttling limits with current documentation
- [ ] OOB OAuth flow still supported by Google
- [ ] Modern email parsing libraries available for Bun/TypeScript
- [ ] Keychain storage API availability in Bun
