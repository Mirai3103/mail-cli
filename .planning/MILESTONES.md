# Milestones

## v1.0 MVP (Shipped: 2026-04-05)

**Phases completed:** 6 phases, 16 plans, 44 tasks

**Key accomplishments:**

- EmailProvider abstract class with GmailProvider stub, HTTP retry client, and JSON error utilities
- 1. [Rule 1 - Bug] Invalid Gmail OAuth scope
- EmailProvider abstract interface updated with Folder.type field and status() method for GmailProvider implementation
- GmailProvider list/status/listFolders methods with CLI commands using googleapis
- Email parsing and composition utilities using mailparser and nodemailer with Gmail API base64url encoding
- GmailProvider read/search/send/reply methods implemented with CLI commands for email operations
- GmailProvider.mark(), move(), delete() implemented via Gmail API messages.modify with correct label manipulation
- Send emails with file attachments via --attach flag using nodemailer MailComposer
- Added mark, move, and delete CLI commands with mutually exclusive flag validation and JSON output
- Outlook OAuth2 module using MSAL device code flow with keytar token storage
- OutlookProvider implementing EmailProvider interface with multi-account CLI --account flag
- Config file system at ~/.emailcli/config.json with auto-creation and environment variable override support
- --ids batch flag for mark/move/delete with partial failure JSON output
- Removed isomorphic-fetch dependency, measured CLI startup at 754ms with bun, created 213-line README for npx distribution
- Fixed OutlookProvider EmailProvider import and converted provider loading to dynamic imports for startup optimization

---
