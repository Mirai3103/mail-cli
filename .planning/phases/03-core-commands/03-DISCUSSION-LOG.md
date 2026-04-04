# Phase 3: Core Commands - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-core-commands
**Areas discussed:** Email parsing, Read response schema, Thread read, Send implementation, Reply subject, Search fields, Reply body

---

## Email Parsing

| Option | Description | Selected |
|--------|-------------|----------|
| mailparser + nodemailer | Add both packages. Handles all MIME edge cases — multipart, encoding, etc. More deps but battle-tested. | ✓ |
| Gmail API parts directly | Parse Gmail API's payload.parts[] manually. No new deps, more custom code, handles basic cases. | |
| Hybrid (API + mailparser fallback) | Use Gmail API parts for simple text emails. Add mailparser only when complex MIME cases arise. | |

**User's choice:** mailparser + nodemailer

---

## Read Response Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Full (headers + text + HTML + attachment list) | All headers, body.text, body.html, and attachment list with id/filename/mimeType/size. Most complete. | ✓ |
| Standard (headers + text + attachment list) | All headers, body.text (no HTML), attachment list. Pragmatic for most use cases. | |
| Minimal (essential headers + body only) | From/To/Subject/Date, body.text, no attachments. Simplest for scripting. | |

**User's choice:** Full

---

## Thread Read

| Option | Description | Selected |
|--------|-------------|----------|
| All messages at once | Returns all thread messages as JSON array in one call. Simpler for agents to process. | ✓ |
| Iterative (one at a time) | Returns first message, caller specifies which to fetch next. More API calls but lower per-call latency. | |

**User's choice:** All messages at once

---

## Send Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| nodemailer → Gmail API | nodemailer constructs RFC 2822 MIME message, then we encode and send via Gmail API. Consistent with mailparser choice, handles all cases. | ✓ |
| Gmail API direct | Construct minimal email directly using Gmail API input schema. No MIME library, but limited to simple text emails without attachments. | |

**User's choice:** nodemailer → Gmail API

---

## Reply Subject

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-prepend Re: | Take original subject, prepend 'Re: ' if not already present. Familiar email convention. | ✓ |
| No, caller provides subject | User specifies full subject via --subject flag. More control, caller handles 'Re:' logic. | |

**User's choice:** Yes, auto-prepend Re:

---

## Search Result Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Same as list (id, from, subject, date, flags) | Consistent with list command. Full Email fetched via separate `read` command. | ✓ |
| Full Email (headers + body) | More data per result — no need to call read separately. Higher latency per result. | |

**User's choice:** Same as list

---

## Reply Body

| Option | Description | Selected |
|--------|-------------|----------|
| Reject --body (enforce empty per spec) | reply command has no --body flag. Body always empty per SEND-04 spec. Simpler, enforced. | ✓ |
| Allow --body (flexible) | reply command accepts --body flag. User can send empty (per spec) or include text if needed. | |

**User's choice:** Reject --body

---

## Claude's Discretion

- Exact header parsing and extraction logic
- How to handle malformed/missing headers gracefully
- Error messages for edge cases (missing thread ID, malformed search syntax)
