# emailcli

A fast, interactive command-line email client for automation and AI agent workflows.

**npm:** `@laffy1309/emailcli`

## Quick Start

```bash
# Run directly with npx
npx @laffy1309/emailcli account add --provider gmail

# Or install globally
npm install -g @laffy1309/emailcli
```

## Setup

### 1. Configure OAuth Credentials

Detailed setup guides:
- **[Gmail Setup Guide](docs/gmail.md)** - Google Cloud Console configuration
- **[Outlook Setup Guide](docs/outlook.md)** - Azure AD app registration

**Quick Summary:**

**Option A: Environment Variables (Recommended)**

Set these before running:
```bash
export GMAIL_CLIENT_ID="your-gmail-client-id"
export GMAIL_CLIENT_SECRET="your-gmail-client-secret"
export OUTLOOK_CLIENT_ID="your-outlook-client-id"
export OUTLOOK_CLIENT_SECRET="your-outlook-client-secret"
```

**Option B: Config File**

Create `~/.emailcli/config.json`:
```json
{
  "gmail": {
    "clientId": "your-gmail-client-id",
    "clientSecret": "your-gmail-client-secret"
  },
  "outlook": {
    "clientId": "your-outlook-client-id",
    "clientSecret": "your-outlook-client-secret"
  }
}
```

Environment variables take precedence over config file values.

### 2. Add Account

```bash
# Gmail
emailcli account add --provider gmail

# Outlook
emailcli account add --provider outlook
```

This opens an OAuth browser flow (Gmail) or device code flow (Outlook). Complete authentication in your browser.

## Commands

### List Emails
```bash
# List inbox (default 20 emails)
emailcli list

# List specific folder
emailcli list --folder "[Gmail]/Sent"

# Limit results
emailcli list --limit 50

# Use specific account
emailcli list --account me@gmail.com:gmail
```

### Read Email
```bash
# Read single email
emailcli read <message-id>

# Read full thread
emailcli read <thread-id> --thread
```

### Search
```bash
# Gmail syntax
emailcli search "from:foo subject:bar"

# Outlook KQL syntax
emailcli search "from:foo subject:bar"
```

### Send Email
```bash
# Basic send
emailcli send --to recipient@example.com --subject "Hello" --body "Message"

# From file
emailcli send --to recipient@example.com --subject "Hello" --body-file-path message.txt

# With attachments
emailcli send --to recipient@example.com --subject "Hello" --body "Message" --attach file.pdf

# CC/BCC
emailcli send --to recipient@example.com --cc other@example.com --bcc hidden@example.com --subject "Hello" --body "Message"
```

### Reply
```bash
emailcli reply <message-id> --to sender@example.com
```

### Mark as Read/Unread
```bash
# Single email
emailcli mark <message-id> --read
emailcli mark <message-id> --unread

# Batch operation (D-01)
emailcli mark --ids 1,2,3 --read
```

### Move Email
```bash
# Single
emailcli move <message-id> --folder "[Gmail]/Trash"

# Batch (D-01)
emailcli move --ids 1,2,3 --folder "[Gmail]/Trash"
```

### Delete Email
```bash
# Single (moves to trash)
emailcli delete <message-id>

# Batch (D-01)
emailcli delete --ids 1,2,3
```

### Folder Operations
```bash
# List folders
emailcli folders

# Mailbox status
emailcli status
```

### Account Management
```bash
# List connected accounts
emailcli account list

# Remove account
emailcli account remove --account me@gmail.com:gmail
```

## JSON Output

All commands output JSON for scripting and AI agent consumption:

```json
{"ok": true}
{"id": "abc123", "from": "sender@example.com", "subject": "Hello", "date": "2024-01-01T00:00:00Z"}
[{"id": "1", "from": "a@example.com"}, {"id": "2", "from": "b@example.com"}]
```

### Error Format

Errors follow consistent envelope:
```json
{"error": {"code": "NO_ACCOUNTS", "message": "No accounts configured. Run 'emailcli account add --provider gmail' first."}}
```

### Batch Partial Failure (D-02)

When batch operations have partial failures:
```json
{"ok": true, "failed": [{"id": "2", "error": {"code": "NOT_FOUND", "message": "Email not found"}}]}
```

## Account Format

Accounts are stored with provider suffix: `email:provider`

- Gmail: `me@gmail.com:gmail`
- Outlook: `me@outlook.com:outlook`

Use `--account` flag to specify which account to use when multiple are configured.

## Installation

```bash
# npm global install
npm install -g @laffy1309/emailcli

# Development from source
bun install
bun run build
```

## Requirements

- Bun runtime (recommended)
- Node.js 18+ (if not using Bun)

## License

MIT
