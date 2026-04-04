---
name: emailcli
description: Use the emailcli CLI to read, search, send, and manage emails. Use whenever the user wants to interact with their email inbox, send emails, search for messages, or manage email organization. Commands like "check my inbox", "send an email", "search for X", "delete spam", "mark as read" should always use this skill. The skill handles the full workflow: composing correct commands, parsing JSON output, handling errors, and presenting results clearly.
---

# emailcli Skill

Use this skill whenever you need to interact with the user's email using the `emailcli` command-line client.

## Quick Reference

```bash
# Installation (if needed)
npm install -g @laffy1309/emailcli

# Commands
emailcli list [--folder FOLDER] [--limit N] [--account EMAIL:PROVIDER]
emailcli read <message-id> [--thread]
emailcli search "<query>" [--account EMAIL:PROVIDER]
emailcli send --to <addr> --subject "<subj>" --body "<text>" [--cc <addr>] [--bcc <addr>] [--attach <file>]
emailcli reply <message-id> --to <addr> [--cc <addr>]
emailcli mark <message-id> --read|--unread
emailcli mark --ids 1,2,3 --read|--unread  # Batch
emailcli move <message-id> --folder "<folder>"
emailcli move --ids 1,2,3 --folder "<folder>"  # Batch
emailcli delete <message-id>
emailcli delete --ids 1,2,3  # Batch
emailcli folders [--account EMAIL:PROVIDER]
emailcli status
emailcli account list|add --provider gmail|outlook|remove --account EMAIL:PROVIDER
```

## Account Format

All accounts use `email:provider` format:
- Gmail: `me@gmail.com:gmail`
- Outlook: `me@outlook.com:outlook`

When multiple accounts exist, use `--account EMAIL:PROVIDER` to specify which one.

## JSON Output

All commands return JSON. Parse output programmatically:

**Success:**
```json
{"ok": true}
{"id": "abc123", "from": "sender@example.com", "subject": "Hello", "date": "2024-01-01T00:00:00Z"}
[{"id": "1", "from": "a@example.com"}, {"id": "2", "from": "b@example.com"}]
```

**Error:**
```json
{"error": {"code": "NO_ACCOUNTS", "message": "No accounts configured. Run 'emailcli account add --provider gmail' first."}}
```

**Batch partial failure:**
```json
{"ok": true, "failed": [{"id": "2", "error": {"code": "NOT_FOUND", "message": "Email not found"}}]}
```

## Command Patterns

### Listing Emails
```bash
# Default: 20 most recent inbox emails
emailcli list

# Specific folder (Gmail uses brackets)
emailcli list --folder "[Gmail]/Sent"

# Limit results
emailcli list --limit 50

# Specific account
emailcli list --account me@gmail.com:gmail
```

### Reading Email
```bash
# Single email by ID (get ID from list output)
emailcli read abc123

# Full thread
emailcli read thread-456 --thread
```

### Searching
```bash
# Gmail search syntax
emailcli search "from:foo subject:bar has:attachment"

# Outlook KQL syntax
emailcli search "from:foo subject:bar"
```

### Sending Email
```bash
# Basic send
emailcli send --to recipient@example.com --subject "Hello" --body "Message"

# With CC/BCC
emailcli send --to recipient@example.com --cc other@example.com --bcc hidden@example.com --subject "Hello" --body "Message"

# From file
emailcli send --to recipient@example.com --subject "Hello" --body-file-path message.txt

# With attachment
emailcli send --to recipient@example.com --subject "Hello" --body "Message" --attach file.pdf
```

### Replying
```bash
emailcli reply <message-id> --to sender@example.com
emailcli reply <message-id> --to sender@example.com --cc other@example.com
```

### Marking
```bash
# Single
emailcli mark abc123 --read
emailcli mark abc123 --unread

# Batch - comma-separated IDs (no spaces)
emailcli mark --ids 1,2,3 --read
```

### Moving
```bash
# Single
emailcli move abc123 --folder "[Gmail]/Trash"

# Batch
emailcli move --ids 1,2,3 --folder "[Gmail]/Archive"
```

### Deleting
```bash
# Single (moves to trash)
emailcli delete abc123

# Batch
emailcli delete --ids 1,2,3
```

### Folder Operations
```bash
# List all folders
emailcli folders

# Mailbox status (message counts)
emailcli status
```

### Account Management
```bash
# Add account
emailcli account add --provider gmail
emailcli account add --provider outlook

# List accounts
emailcli account list

# Remove account
emailcli account remove --account me@gmail.com:gmail
```

## Workflows

### Check Inbox
1. Run `emailcli list` to get recent emails
2. Parse JSON output - each email has `id`, `from`, `subject`, `date`
3. Present summary to user
4. User can request specific email by ID

### Send Email
1. Collect: recipient, subject, body (and optionally CC, attachments)
2. Compose command with proper escaping
3. Execute and check for `{"ok": true}` or error
4. Report success or error message

### Search and Act
1. Run `emailcli search` with appropriate query syntax
2. Present results
3. User can then mark, move, delete by ID

### Batch Operations
1. Get list of IDs (from list or search results)
2. Use `--ids 1,2,3` format (comma-separated, no spaces)
3. Check response for `failed` array to identify partial failures

## Error Handling

If you receive an error response:
1. Extract `error.code` and `error.message`
2. Present the issue clearly to the user
3. Suggest remediation if applicable:
   - `NO_ACCOUNTS`: Run `emailcli account add --provider gmail|outlook`
   - `NOT_FOUND`: The message ID doesn't exist or was already deleted
   - `INVALID_CREDENTIALS`: Re-authenticate with `emailcli account remove` then `emailcli account add`

## Important Notes

- Always use JSON output parsing - the CLI only outputs JSON
- Gmail folders use brackets: `[Gmail]/Sent`, `[Gmail]/Trash`, `[Gmail]/Archive`
- Message IDs from list/search are strings, preserve them exactly
- Batch IDs must be comma-separated with no spaces: `--ids 1,2,3`
- Reply requires both the message ID and `--to` with the recipient address
