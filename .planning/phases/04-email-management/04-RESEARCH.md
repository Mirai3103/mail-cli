# Phase 4: Email Management - Research

**Researched:** 2026-04-04
**Domain:** Gmail API message modification (mark/move/delete) + nodemailer attachments
**Confidence:** HIGH

## Summary

Phase 4 implements email organization operations via Gmail API `messages.modify` and attachment support via nodemailer's existing infrastructure. The Gmail API uses label IDs for all operations -- `messages.modify` accepts `addLabelIds` and `removeLabelIds` arrays. The `listFolders()` method already returns valid label names for validation. Nodemailer `MailComposer` already supports attachments but the current `buildRawMessage()` does not pass them through.

**Primary recommendation:** Implement `GmailProvider.mark/move/delete` using `messages.modify`, wire attachments into `buildRawMessage()` via `attachments: [{filename, path}]` option.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- `mail-cli delete <id>` moves to TRASH (Gmail modify with TRASH label)
- Mark uses `--read` and `--unread` boolean flags (mutually exclusive)
- Send supports `--attach` flag, repeatable, validates file exists
- Gmail API methods: messages.modify for all operations
- Provider-native folder names (no abstraction)
- Output: `{"ok": true}` on success

### Claude's Discretion
- How to validate folder names (can use existing `listFolders()` or allow any name)

### Deferred Ideas (OUT OF SCOPE)
- Batch operations (--ids) deferred to Phase 6
- Permanent delete via `purge` command

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEND-03 | User can send email with attachments (--attach flag, multiple allowed) | nodemailer MailComposer accepts `attachments: [{filename, path}]` array; `buildRawMessage()` needs to pass attachments through |
| ORG-01 | User can mark email as read/unread | Gmail API `messages.modify` with removeLabelIds: ["UNREAD"] for read, addLabelIds: ["UNREAD"] for unread |
| ORG-02 | User can move email to folder/label | Gmail API `messages.modify` with addLabelIds: [targetLabel]; validate against `listFolders()` |
| ORG-03 | User can trash/delete email | Gmail API `messages.modify` with addLabelIds: ["TRASH"] |

## Standard Stack

### Core (Already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^171.4.0 | Gmail API client | Official Google library; `messages.modify` for all org operations |
| nodemailer | ^8.0.4 | Email composition with attachments | MailComposer accepts `attachments: [{filename, path}]` |
| commander | ^14.0.3 | CLI argument parsing | Already used; `--attach` flag with array accumulation |

**No new dependencies required.**

## Architecture Patterns

### Gmail API messages.modify pattern

All three operations (mark/move/delete) use the same `messages.modify` endpoint with different label payloads:

```typescript
// Mark as READ (remove UNREAD label)
gmail.users.messages.modify({
  userId: "me",
  id: messageId,
  requestBody: {
    removeLabelIds: ["UNREAD"],
  }
});

// Mark as UNREAD (add UNREAD label)
gmail.users.messages.modify({
  userId: "me",
  id: messageId,
  requestBody: {
    addLabelIds: ["UNREAD"],
  }
});

// Move to folder (add target label by name)
gmail.users.messages.modify({
  userId: "me",
  id: messageId,
  requestBody: {
    addLabelIds: ["[Gmail]/Sent"],  // provider-native label name
  }
});

// Trash (add TRASH label)
gmail.users.messages.modify({
  userId: "me",
  id: messageId,
  requestBody: {
    addLabelIds: ["TRASH"],
  }
});
```

Source: `node_modules/googleapis/build/src/apis/gmail/v1.d.ts` (Schema$ModifyMessageRequest)

### Nodemailer attachments pattern

MailComposer accepts attachments as an array of objects with `filename` and `path` properties:

```typescript
const mailComposer = new MailComposer({
  to: options.to.join(", "),
  cc: options.cc?.join(", "),
  subject: options.subject,
  text: options.text,
  attachments: [
    { filename: "document.pdf", path: "/path/to/document.pdf" }
  ],
});
```

Source: `node_modules/nodemailer/lib/mailer/mail-message.js` lines 62-77

### Existing project patterns to follow

**CLI command structure** (from `src/cli.ts`):
```typescript
// Boolean mutually exclusive flags
program
  .command("mark")
  .description("Mark email as read/unread")
  .argument("<id>", "Email ID")
  .option("--read", "Mark as read")
  .option("--unread", "Mark as unread")
  .action(async (id, options) => { /* ... */ });
```

**Error handling** (from `src/utils/errors.ts`):
```typescript
throw new CLIError("CODE", "Human readable message");
// Output: { "error": { "code": "CODE", "message": "Human readable message" } }
```

**Success output** (from context D-05):
```typescript
console.log(JSON.stringify({ ok: true }));
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Label validation | Custom label name validation logic | Existing `listFolders()` method | Already implemented; returns `{id, name, type}` |
| Attachment encoding | Custom MIME attachment handling | nodemailer MailComposer | Already handles base64 encoding, multipart MIME tree |
| API error parsing | Custom Gmail error extraction | `CLIError` wrapping with `GMAIL_API_ERROR` code | Consistent with existing pattern |

## Common Pitfalls

### Pitfall 1: Gmail label case sensitivity
**What goes wrong:** Gmail labels are case-sensitive but Gmail API accepts both. User may pass `[Gmail]/Sent` vs `[Gmail]/sent`.
**Why it happens:** Gmail treats labels as case-insensitive in the UI but the API is case-sensitive.
**How to avoid:** Accept user input as-is (Gmail will handle it); no normalization needed.
**Warning signs:** API returns 400 with "invalid label" error.

### Pitfall 2: Attachments not being sent
**What goes wrong:** `buildRawMessage()` doesn't pass attachments to MailComposer even though `SendEmailOptions` has `attachments?: string[]`.
**Why it happens:** Current `composer.ts` doesn't include `attachments` in MailComposer options.
**How to avoid:** Pass attachments array with `{filename: basename(path), path}` format to MailComposer.
**Warning signs:** Email sends without attachments attached.

### Pitfall 3: UNREAD label for marking read
**What goes wrong:** Using wrong label name -- `READ` instead of `UNREAD`.
**Why it happens:** Gmail uses UNREAD as the label; removing it = read, adding it = unread.
**How to avoid:** Remember: `removeLabelIds: ["UNREAD"]` = mark read, `addLabelIds: ["UNREAD"]` = mark unread.
**Warning signs:** No visible change in Gmail after operation.

### Pitfall 4: Move to TRASH instead of moving OUT of TRASH
**What goes wrong:** Using `messages.modify` with `addLabelIds: ["TRASH"]` when should use `removeLabelIds: ["TRASH"]`.
**Why it happens:** Gmail trash is a label like any other.
**How to avoid:** For delete: `addLabelIds: ["TRASH"]`. To restore: `removeLabelIds: ["TRASH"]`.

## Code Examples

### GmailProvider.mark() implementation
```typescript
async mark(id: string, read: boolean): Promise<void> {
  try {
    const accessToken = await this.getAuthToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        // D-02: read=true means remove UNREAD (mark as read)
        // read=false means add UNREAD (mark as unread)
        removeLabelIds: read ? ["UNREAD"] : [],
        addLabelIds: read ? [] : ["UNREAD"],
      },
    });
  } catch (err) {
    if (err instanceof CLIError) throw err;
    throw new CLIError(
      "GMAIL_API_ERROR",
      `Failed to mark message ${id}`,
      err
    );
  }
}
```

### GmailProvider.move() implementation
```typescript
async move(id: string, folder: string): Promise<void> {
  try {
    const accessToken = await this.getAuthToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: [folder],  // D-09: provider-native label name
      },
    });
  } catch (err) {
    if (err instanceof CLIError) throw err;
    throw new CLIError(
      "GMAIL_API_ERROR",
      `Failed to move message ${id} to ${folder}`,
      err
    );
  }
}
```

### GmailProvider.delete() implementation
```typescript
async delete(id: string): Promise<void> {
  try {
    const accessToken = await this.getAuthToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // D-01: Trash, not permanent delete
    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: ["TRASH"],
      },
    });
  } catch (err) {
    if (err instanceof CLIError) throw err;
    throw new CLIError(
      "GMAIL_API_ERROR",
      `Failed to trash message ${id}`,
      err
    );
  }
}
```

### buildRawMessage() with attachments
```typescript
export function buildRawMessage(options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: string[];  // ADD: array of file paths
}): string {
  const mailComposer = new MailComposer({
    to: options.to.join(", "),
    cc: options.cc?.join(", "),
    bcc: options.bcc?.join(", "),
    subject: options.subject,
    text: options.text,
    html: options.html,
    headers: options.headers,
    attachments: options.attachments?.map(path => ({
      filename: path.split("/").pop() || path,
      path,
    })),
  });

  const messageBuffer = mailComposer.compile().build() as Buffer;
  return base64UrlEncode(messageBuffer);
}
```

### CLI mark command
```typescript
program
  .command("mark")
  .description("Mark email as read or unread")
  .argument("<id>", "Email ID")
  .option("--read", "Mark as read")
  .option("--unread", "Mark as unread")
  .action(async (id, options) => {
    try {
      // D-02: Mutually exclusive --read and --unread
      if (!options.read && !options.unread) {
        throw new CLIError(
          "MISSING_FLAG",
          "Either --read or --unread must be specified"
        );
      }
      if (options.read && options.unread) {
        throw new CLIError(
          "CONFLICTING_FLAGS",
          "Cannot use both --read and --unread"
        );
      }

      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);
      await provider.mark(id, !!options.read);

      console.log(JSON.stringify({ ok: true }));
    } catch (err) {
      printError(err as Error);
      process.exit(1);
    }
  });
```

### CLI send with attachments (SEND-03)
```typescript
// In send command action:
.option("--attach <path>", "Attachment file path (can be repeated)", [])  // Commander collects into array
.action(async (options) => {
  // ... existing body handling ...

  // D-03: Multiple attachments via --attach flag
  // D-04: Validate file exists before sending
  const attachments: string[] = [];
  if (options.attach) {
    const attachPaths = Array.isArray(options.attach) ? options.attach : [options.attach];
    for (const path of attachPaths) {
      const file = Bun.file(path);
      if (!await file.exists()) {
        throw new CLIError("FILE_NOT_FOUND", `Attachment file not found: ${path}`);
      }
      attachments.push(path);
    }
  }

  const result = await provider.send({
    to,
    cc,
    bcc,
    subject: options.subject,
    body,
    attachments,  // Wire attachments through
  });

  console.log(JSON.stringify({ id: result }));
});
```

## Open Questions

1. **Move folder validation**
   - What we know: `listFolders()` returns valid labels; user must pass provider-native name
   - What's unclear: Should we validate the folder name exists before calling `messages.modify`?
   - Recommendation: Per D-09, user passes exact Gmail label name; validate by checking against `listFolders()` output to give clear error if invalid

2. **UNREAD label name confirmation**
   - What we know: Gmail API uses "UNREAD" as the label ID for unread state
   - What's unclear: Is this consistent across all Gmail accounts?
   - Recommendation: Verified against googleapis v1.d.ts Schema$Label and existing gmail-provider.ts patterns

## Sources

### Primary (HIGH confidence)
- `node_modules/googleapis/build/src/apis/gmail/v1.d.ts` -- messages.modify API signature, Schema$ModifyMessageRequest, Schema$Label
- `node_modules/nodemailer/lib/mailer/mail-message.js` -- attachment handling (lines 62-77)
- `src/providers/gmail-provider.ts` -- existing GmailProvider patterns
- `src/cli.ts` -- existing CLI command patterns
- `src/utils/errors.ts` -- CLIError class

### Secondary (MEDIUM confidence)
- N/A

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - all libraries already in project, API verified in types
- Architecture: HIGH - existing patterns well-established in codebase
- Pitfalls: HIGH - Gmail API behavior well-documented, identified from source analysis

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- Gmail API stable)
