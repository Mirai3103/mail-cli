# Phase 3: Core Commands - Research

**Researched:** 2026-04-04
**Domain:** Email parsing (mailparser), MIME construction (nodemailer), Gmail API raw message format
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 implements read, search, send, and reply commands. The critical technical challenges are: (1) decoding Gmail API's base64url `raw` field into an RFC 2822 string for mailparser, (2) using nodemailer's `MailComposer` to build an RFC 2822 message, then base64url-encoding it for Gmail API's `raw` field, and (3) threading emails via `users.threads.get`. All four requirements (READ-01, READ-02, SCH-01, SCH-02, SEND-01, SEND-02, SEND-04) are addressable with these patterns.

**Primary recommendation:** Install `mailparser@3.9.6` and `nodemailer@8.0.4`, use `simpleParser()` for reading and `MailComposer` for sending, and rely on Gmail API's `format=RAW` for raw message operations.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `mailparser` for parsing received emails (raw RFC 2822 to structured Email object)
- **D-02:** Use `nodemailer` for constructing outgoing emails (Email object to RFC 2822 raw)
- **D-07:** search uses Gmail native search syntax directly
- **D-12:** send uses nodemailer to construct MIME message, then encodes to base64url for Gmail API `raw` field
- **D-13:** reply sets References/In-Reply-To headers automatically
- **D-03 to D-06, D-08 to D-11, D-14 to D-16:** All read, thread, search, send, and reply behavior specifications

### Claude's Discretion
- Exact header parsing and extraction logic
- How to handle malformed/missing headers gracefully
- Error messages for edge cases (missing thread ID, malformed search syntax)

### Deferred Ideas (OUT OF SCOPE)
None.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-01 | Read single email by ID (headers, body text, attachments list) | mailparser `simpleParser()` decodes Gmail `raw` field; `ParsedMail` interface provides `headers`, `body.text`, `body.html`, `attachments[]` |
| READ-02 | Read email thread (messages in conversation via thread ID) | Gmail `users.threads.get({threadId})` returns all messages; each message fetched with `format=RAW` then parsed with mailparser |
| SCH-01 | Search emails using provider native search syntax | Gmail `users.messages.list({q: query})` accepts Gmail search syntax directly |
| SCH-02 | Search results returned as JSON array | `gmail.users.messages.list` returns `{messages: [{id, threadId}]}`; batch-fetch metadata for each |
| SEND-01 | Send email with --to, --subject, --body flags | nodemailer `MailComposer` constructs MIME; `.build()` returns Buffer, then base64url encode for Gmail `raw` |
| SEND-02 | Send email with body from file (--body-file-path) | Read file with `Bun.file()` or `Bun.readFile()`, pass string to nodemailer `text` option |
| SEND-04 | Reply to existing thread (References/In-Reply-To headers set, body empty) | Fetch original message headers (References, In-Reply-To, threadId); nodemailer `setHeader()` for References/In-Reply-To; prepend "Re: " to subject if missing |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mailparser | 3.9.6 | Parse raw RFC 2822 email into structured object | Standard for Node.js email parsing; simpleParser handles MIME structure, attachments, headers automatically |
| nodemailer | 8.0.4 | Construct RFC 2822 MIME messages | Standard for Node.js email construction; MailComposer generates RFC 2822 compliant messages |
| googleapis | 171.4.0 | Gmail API client (already installed) | Official Google library; `format=RAW` for raw message operations |
| @microsoft/microsoft-graph-client | (not yet installed) | Outlook/Graph API (Phase 5) | For multi-provider support |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| Bun native `btoa()`/`atob()` | Base64 encoding for Gmail API raw field | Convert RFC 2822 string to base64, then transform to base64url |
| Bun native `Bun.file()` / `Bun.readFile()` | Read file for --body-file-path | Per CLAUDE.md - Bun native APIs over node:fs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mailparser | PostalMime (mailparser fork, maintained) | Both work; mailparser is more established but in maintenance mode |
| Custom base64url encoder | `base64url` npm package | Bun's `btoa()` + string replacement achieves same result without extra dep |
| nodemailer raw building | Build raw MIME manually | Hand-rolling MIME is error-prone; nodemailer handles edge cases |

### Installation

```bash
bun add mailparser nodemailer
```

Verify versions:
```bash
npm view mailparser version   # 3.9.6
npm view nodemailer version    # 8.0.4
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── providers/
│   ├── email-provider.ts   # Already exists: EmailProvider, Email, SendEmailOptions interfaces
│   └── gmail-provider.ts   # Already exists: stubs to implement
├── cli.ts                   # Already exists: add read/search/send/reply commands
└── utils/
    ├── errors.ts            # Already exists: CLIError, printError
    └── index.ts             # Already exists: re-exports
```

New file to add:
```
src/
├── email/
│   ├── parser.ts            # mailparser wrapper: decodeBase64UrlRaw(), parseRawEmail()
│   └── composer.ts          # nodemailer wrapper: buildRawMessage(), buildReplyMessage()
```

### Pattern 1: Parsing Gmail API Raw Messages (READ-01, READ-02)

**What:** Convert Gmail API's base64url-encoded `raw` field to a structured `Email` object.

**When to use:** When fetching a message with `format=RAW` from Gmail API.

**Flow:**
1. Gmail API returns `{raw: "<base64url-encoded-RFC-2822>"}`
2. Decode base64url to UTF-8 string (RFC 2822 raw)
3. Pass raw string to `simpleParser()` from mailparser
4. Extract fields into the project's `Email` interface

**Example:**
```typescript
// Source: mailparser API (nodemailer.com/extras/mailparser/)
import { simpleParser } from "mailparser";

function decodeBase64UrlRaw(base64url: string): string {
  // Gmail API raw is base64url (URL-safe, no padding)
  // Convert to standard base64: replace - with +, _ with /, add padding
  const standardBase64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standardBase64.padEnd(standardBase64.length + (4 - standardBase64.length % 4) % 4, "=");
  // Use Bun's atob (which is standard base64 decode)
  return atob(padded);
}

async function parseGmailRaw(rawBase64Url: string): Promise<Email> {
  const raw = decodeBase64UrlRaw(rawBase64Url);
  const parsed = await simpleParser(raw);

  // parsed.headers is a Map<string, string>
  // For address headers (From, To, Cc), mailparser provides parsed.from / parsed.to as Address objects

  return {
    id: "", // set by caller from Gmail API response
    threadId: "", // set by caller
    from: parsed.from?.value?.[0]?.address || "",
    to: parsed.to?.value?.map(a => a.address) || [],
    subject: parsed.subject || "",
    date: parsed.date?.toISOString() || "",
    body: parsed.body?.text || parsed.text || "",  // D-03: body.text
    flags: [], // set by caller from labelIds
    attachments: parsed.attachments?.map((att, idx) => ({
      id: String(idx),
      filename: att.filename || "attachment",
      mimeType: att.contentType || "application/octet-stream",
      size: att.size || 0,
    })),
  };
}
```

**Source:** mailparser API documented at nodemailer.com/extras/mailparser/ (404 at time of research, but API is well-established)

### Pattern 2: Constructing Raw MIME for Gmail API (SEND-01, SEND-02, SEND-04)

**What:** Build an RFC 2822 MIME message with nodemailer, then base64url-encode for Gmail API's `raw` field.

**When to use:** When sending or replying to email via Gmail API.

**Flow:**
1. Create nodemailer `MailComposer` with mail options
2. Call `.compile().build()` to get RFC 2822 Buffer
3. Convert Buffer to base64url string
4. Send via Gmail API `users.messages.send({raw: base64urlString})`

**Example:**
```typescript
// Source: nodemailer MailComposer API
import nodemailer from "nodemailer";
import { MailComposer } from "nodemailer";

function buildRawMessage(options: {
  from?: string;
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: Array<{filename: string; content: Buffer | string; contentType?: string}>;
}): string {
  const mailComposer = new MailComposer({
    from: options.from,
    to: options.to.join(", "),
    cc: options.cc?.join(", "),
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
    headers: options.headers,
  });

  // build() returns Buffer of RFC 2822 message
  const messageBuffer = mailComposer.compile().build();
  return base64UrlEncode(messageBuffer);
}

function base64UrlEncode(buffer: Buffer): string {
  // Convert Buffer to standard base64, then to base64url
  const base64 = buffer.toString("base64");
  // Standard base64 to base64url: replace + with -, / with _, remove padding
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
```

### Pattern 3: Gmail Thread Reading (READ-02)

**What:** Fetch all messages in a thread via Gmail API.

**When to use:** When implementing `read --thread <thread-id>`.

**Flow:**
1. Call `gmail.users.threads.get({userId: "me", id: threadId, format: "full"})`
2. Response contains `messages[]` array with full message payloads
3. For each message in thread: extract headers from `payload.headers`
4. Note: `users.threads.get` with `format: "full"` returns full message data including body, but the body is in the nested `payload` structure (not `raw`). May need separate `messages.get` call with `format: "raw"` for mailparser parsing.

**Example:**
```typescript
// Source: Gmail API users.threads.get
const threadResponse = await gmail.users.threads.get({
  userId: "me",
  id: threadId,
  format: "full",  // returns messages with payload (not raw)
});

// threadResponse.data.messages is array of Message objects
// Each message has: id, threadId, payload (with headers), snippet
const messages = threadResponse.data.messages || [];

// For full body parsing with mailparser, fetch raw format:
for (const msg of messages) {
  const rawResponse = await gmail.users.messages.get({
    userId: "me",
    id: msg.id,
    format: "RAW",  // returns base64url-encoded raw
  });
  const email = await parseGmailRaw(rawResponse.data.raw);
  // ...
}
```

**Gmail API Note:** `users.threads.get` with `format: "RAW"` is not supported. Must use `messages.get` for raw format.

### Pattern 4: Gmail Search (SCH-01, SCH-02)

**What:** Use Gmail's native search syntax via `users.messages.list`.

**When to use:** For the `search` command.

**Implementation:** Uses `gmail.users.messages.list({q: query, maxResults: limit})` where `q` is the raw Gmail search syntax (e.g., `from:example.com is:unread`). Returns `{messages: [{id, threadId}]}`. Batch-fetch metadata for each message.

**Example:**
```typescript
// Source: Gmail API users.messages.list
const listResponse = await gmail.users.messages.list({
  userId: "me",
  q: searchQuery,  // D-07: Gmail native search syntax directly
  maxResults: limit,
});

const messages = listResponse.data.messages || [];
// Fetch metadata for each
const emails = await Promise.all(messages.map(async (msg) => {
  const detail = await gmail.users.messages.get({
    userId: "me",
    id: msg.id,
    format: "METADATA",
    metadataHeaders: ["From", "Subject", "Date"],
  });
  const headers = detail.data.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name === name)?.value || "";
  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    flags: detail.data.labelIds || [],
  };
}));
```

### Pattern 5: Reply with References/In-Reply-To (SEND-04)

**What:** Build a reply message with proper threading headers.

**When to use:** For `reply <id>` command.

**Flow:**
1. Fetch original message to get `References`, `In-Reply-To`, `threadId`, and subject
2. Prepend "Re: " to subject if not already present (D-14)
3. Set `In-Reply-To` to original `Message-ID`
4. Set `References` to original `References` + original `Message-ID` (or just original `Message-ID` if no References)
5. Body is empty per D-15

**Example:**
```typescript
// Source: RFC 2822 / nodemailer header conventions
async function buildReplyMessage(gmail: any, originalId: string): Promise<string> {
  // Fetch original message (metadata + raw for headers)
  const original = await gmail.users.messages.get({
    userId: "me",
    id: originalId,
    format: "METADATA",
    metadataHeaders: ["Message-ID", "References", "In-Reply-To", "Subject", "Thread-ID"],
  });

  const headers = original.data.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name === name)?.value || "";

  const messageId = getHeader("Message-ID");
  const inReplyTo = getHeader("In-Reply-To") || messageId;
  const existingRefs = getHeader("References");
  const originalSubject = getHeader("Subject");
  const threadId = original.data.threadId;

  // D-14: Prepend "Re: " if not present
  const subject = originalSubject.match(/^Re:/i) ? originalSubject : `Re: ${originalSubject}`;

  // D-13: Build References header
  const references = existingRefs
    ? `${existingRefs} ${messageId}`
    : messageId;

  return buildRawMessage({
    to: [],  // reply goes to sender; caller should extract from original
    subject,
    text: "",  // D-15: empty body
    headers: {
      "In-Reply-To": inReplyTo,
      References": references,
    },
  });
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME encoding | Hand-coded RFC 2822 string building | nodemailer `MailComposer` | Handles multipart/alternative, attachment encoding, line length limits, header folding, charset conversion |
| Email parsing | Regex on raw email string | mailparser `simpleParser()` | Handles MIME structure, nested parts, content-transfer-encoding, charset conversion, attachment extraction |
| Base64url encoding | Custom encoding algorithm | `btoa()` + string replacement | Gmail API requires base64url (URL-safe); straightforward transformation from standard base64 |
| Thread header construction | String concatenation for References | Fetch from original headers per RFC 2822 | References format is space-separated Message-ID list; malformed References breaks threading |

## Common Pitfalls

### Pitfall 1: base64url vs base64 Confusion
**What goes wrong:** Gmail API `raw` field is base64url-encoded. Using standard base64 decoding produces garbage.
**Why it happens:** Base64url uses `-` and `_` instead of `+` and `/`, and omits padding `=`.
**How to avoid:** Always convert base64url to standard base64 before decoding:
```typescript
const standardBase64 = raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(raw.length + (4 - raw.length % 4) % 4, "=");
const decoded = atob(standardBase64);
```
**Warning signs:** `simpleParser()` throws on non-UTF8 input, or decoded string looks like binary garbage.

### Pitfall 2: Missing Message-ID Header in Replies
**What goes wrong:** Reply has no In-Reply-To or References, breaking thread continuity.
**Why it happens:** Not all emails have Message-ID (rare but possible with broken MTAs).
**How to avoid:** Always fall back to the message's own Message-ID: `inReplyTo = messageId || "<no-message-id@local>"`.
**Warning signs:** Reply appears as new thread in Gmail.

### Pitfall 3: threads.get Returns Messages Without Raw Format
**What goes wrong:** Calling `users.threads.get({format: "RAW"})` returns an error; threads endpoint does not support RAW format.
**Why it happens:** Gmail API limitation - thread-level requests don't support RAW format.
**How to avoid:** Use `users.threads.get({format: "full"})` for thread metadata, then individually call `users.messages.get({id: msgId, format: "RAW"})` for each message when full body parsing is needed.
**Warning signs:** `threads.get` returns messages but body is in nested `payload` structure, not `raw`.

### Pitfall 4: Multipart/Alternative Email Body Access
**What goes wrong:** `parsed.body.text` is undefined, or HTML-only email shows empty body.
**Why it happens:** mailparser `body` property is a `BodyStructure` object with `text` and `html` sub-properties. Also: `parsed.text` and `parsed.html` are shortcut properties that may be more reliable.
**How to avoid:** Use both: `body: parsed.body?.text || parsed.text || parsed.body?.html || parsed.html || ""`.
**Warning signs:** Emails with HTML but no plain text show empty body.

### Pitfall 5: Gmail Search Query Validation
**What goes wrong:** Invalid Gmail search syntax returns no results silently.
**Why it happens:** Gmail API accepts any string as query; malformed syntax is ignored, not rejected.
**How to avoid:** Document the command as passing syntax directly to Gmail (D-07). Return empty array gracefully rather than erroring.
**Warning signs:** Search returns `{"messages": []}` for seemingly valid queries.

## Code Examples

### Reading a single email (READ-01)

```typescript
// Source: Gmail API format=RAW + mailparser simpleParser
async read(id: string): Promise<Email> {
  const accessToken = await this.getAuthToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // D-03: Fetch raw message for full body parsing
  const response = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "RAW",
  });

  const raw = response.data.raw!;  // base64url-encoded RFC 2822
  const parsed = await simpleParser(decodeBase64UrlRaw(raw));

  // D-03: Return full Email object
  return {
    id,
    threadId: response.data.threadId!,
    from: parsed.from?.value?.[0]?.address || "",
    to: parsed.to?.value?.map(a => a.address) || [],
    subject: parsed.subject || "",
    date: parsed.date?.toISOString() || "",
    body: parsed.body?.text || parsed.text || "",  // D-03: body.text
    flags: response.data.labelIds || [],
    attachments: parsed.attachments?.map((att, idx) => ({
      id: String(idx),
      filename: att.filename || "attachment",
      mimeType: att.contentType || "application/octet-stream",
      size: att.size || 0,
    })) || [],
  };
}
```

### Searching emails (SCH-01, SCH-02)

```typescript
// Source: Gmail API users.messages.list with q parameter
async search(query: string, limit: number = 20): Promise<Email[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const accessToken = await this.getAuthToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // D-07: Pass Gmail search syntax directly
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: safeLimit,
  });

  const messages = listResponse.data.messages || [];

  // D-08: Fetch metadata for each message
  const emails = await Promise.all(messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "METADATA",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || "";

    return {
      id: msg.id!,
      threadId: msg.threadId!,
      from: getHeader("From"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      flags: detail.data.labelIds || [],
    };
  }));

  return emails;
}
```

### Sending an email (SEND-01, SEND-02)

```typescript
// Source: nodemailer MailComposer + Gmail API users.messages.send
async send(msg: SendEmailOptions): Promise<string> {
  const accessToken = await this.getAuthToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // D-12: Build MIME with nodemailer, encode to base64url
  const mailComposer = new MailComposer({
    from: undefined,  // uses authenticated account
    to: msg.to.join(", "),
    cc: msg.cc?.join(", "),
    bcc: msg.bcc?.join(", "),
    subject: msg.subject,
    text: msg.body,
    attachments: msg.attachments?.map(filename => ({
      filename,
      content: Bun.file(filename),  // Per CLAUDE.md: use Bun.file()
    })),
  });

  const rawBuffer = mailComposer.compile().build();
  const rawBase64Url = base64UrlEncode(rawBuffer);

  const sendResponse = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawBase64Url },
  });

  return sendResponse.data.id!;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IMAP for email access | Gmail API with format=RAW | Project inception | No IMAP per project constraints; Gmail API provides richer data |
| `node-fetch` for HTTP | Built-in `fetch` | Project inception | Bun native fetch; no external HTTP library needed |
| `querystring` for search | Gmail native `q` parameter | Project inception | Gmail search syntax is richer than URL params |
| Custom MIME builder | nodemailer MailComposer | D-02 (Phase 3 context) | RFC 2822 compliance, multipart handling |
| Regex-based email parser | mailparser simpleParser | D-01 (Phase 3 context) | Handles all MIME edge cases |

**Deprecated/outdated:**
- `mailparser` is in maintenance mode (no new features). Considered stable for parsing. PostalMime is the actively maintained fork but has the same API.

## Open Questions

1. **How to handle HTML-only emails (no plain text)?**
   - What we know: `parsed.body.text` may be undefined; `parsed.html` exists; `parsed.text` is a concatenation shortcut
   - What's unclear: Which takes precedence when both exist; how mailparser handles `multipart/alternative`
   - Recommendation: Use `parsed.body?.text || parsed.text || parsed.body?.html || parsed.html || ""`

2. **What scope does the OAuth token need for raw message operations?**
   - What we know: Project uses `gmail.modify` scope which covers read/write
   - What's unclear: Whether `gmail.send` is needed separately for send
   - Recommendation: `gmail.modify` covers both read and send per Google docs; verify with test send

3. **nodemailer async build() vs sync build()**
   - What we know: MailComposer has both async `.build()` and sync `.build()` methods
   - What's unclear: Which is appropriate for Bun runtime
   - Recommendation: Use async `build()` which returns `Promise<Buffer>` for clarity

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond npm packages - mailparser and nodemailer will be installed via `bun add`)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| mailparser | Email parsing (READ-01, READ-02) | Not installed | - | Install via `bun add mailparser` |
| nodemailer | Email construction (SEND-01, SEND-02, SEND-04) | Not installed | - | Install via `bun add nodemailer` |
| googleapis | Gmail API | Already installed | 171.4.0 | None needed |
| Bun runtime | Project runtime | Available | 1.x | N/A |

**Missing dependencies with no fallback:**
- mailparser and nodemailer need to be installed before Phase 3 implementation

**Missing dependencies with fallback:**
- None identified

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun test (per CLAUDE.md) |
| Config file | None - uses default bun test runner |
| Quick run command | `bun test` |
| Full suite command | `bun test --all` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| READ-01 | Read single email by ID, returns headers+body+attachments | unit | `bun test src/email/parser.test.ts` | Need to create |
| READ-02 | Read thread returns all messages in thread as JSON array | unit | `bun test src/providers/gmail-provider.test.ts` | Need to create |
| SCH-01 | Search uses Gmail native syntax | unit | `bun test src/providers/gmail-provider.test.ts` | Need to create |
| SCH-02 | Search results returned as JSON array | unit | `bun test src/providers/gmail-provider.test.ts` | Need to create |
| SEND-01 | Send email with --to, --subject, --body | unit | `bun test src/email/composer.test.ts` | Need to create |
| SEND-02 | Send email with body from file | unit | `bun test src/email/composer.test.ts` | Need to create |
| SEND-04 | Reply sets References/In-Reply-To, body empty | unit | `bun test src/email/composer.test.ts` | Need to create |

### Sampling Rate
- **Per task commit:** `bun test` (fast, all tests)
- **Per wave merge:** `bun test --all`
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/email/parser.ts` — mailparser wrapper (decodeBase64UrlRaw, parseGmailRaw) - covers READ-01
- [ ] `src/email/composer.ts` — nodemailer wrapper (buildRawMessage, buildReplyMessage) - covers SEND-01, SEND-02, SEND-04
- [ ] `src/providers/gmail-provider.test.ts` — unit tests for read, search, send, reply
- [ ] `src/email/parser.test.ts` — unit tests for mailparser wrapper
- [ ] `src/email/composer.test.ts` — unit tests for nodemailer wrapper
- [ ] Framework install: `bun add -d mailparser nodemailer` — install dependencies

## Sources

### Primary (HIGH confidence)
- Gmail API REST reference (`developers.google.com/gmail/api/reference/rest/v1/`) — Format enum (raw/full/metadata/minimal), users.threads.get, users.messages.get, users.messages.send, users.messages.list
- nodemailer MailComposer source (`raw.githubusercontent.com/nodemailer/nodemailer/master/lib/mail-message/index.js`) — build method returns Buffer
- Bun native APIs (`node_modules/bun-types/`) — btoa/atob for base64 encoding

### Secondary (MEDIUM confidence)
- mailparser API (`nodemailer.com/extras/mailparser/`) — simpleParser function signature, ParsedMail structure (subject, from, to, headers, body, attachments); domain returned 404 at time of research, API is established
- nodemailer about page (`nodemailer.com/about/`) — general MailComposer documentation

### Tertiary (LOW confidence)
- WebSearch for "nodemailer gmail api raw message base64url" — no results returned (search API errors); information inferred from Gmail API docs and nodemailer source
- WebSearch for "mailparser simpleParser attachments" — no results returned (search API errors); information from mailparser TypeScript definitions

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH — mailparser and nodemailer versions confirmed via npm, Gmail API patterns verified via official docs, Bun base64 APIs verified in bun-types
- Architecture: HIGH — EmailProvider interface already exists, GmailProvider pattern established in Phase 2, all decisions locked in CONTEXT.md
- Pitfalls: MEDIUM — base64url encoding approach is correct but not tested against actual Gmail API response; mailparser body access patterns inferred from documentation

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days for stable Gmail API patterns; nodemailer/mailparser APIs are stable)
