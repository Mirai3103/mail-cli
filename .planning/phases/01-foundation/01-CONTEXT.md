# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Source:** Discuss-phase (manual)

## Phase Boundary

Phase 1 establishes the project structure, OAuth2 authentication, and the EmailProvider interface. This is the foundation all subsequent phases build on.

## Implementation Decisions

### Authentication & OAuth
- **OAuth flow**: Manual URL display → user copies verification code from browser → pastes in CLI
- **Account IDs**: Email address (e.g., `me@gmail.com`) — used as keytar account name
- **Token storage**: Full OAuth JSON blob in keytar (service=`mail-cli`, account=`email`)
- **Scopes**: Full Gmail read/write/delete

### Architecture
- **Source layout**: Flat `src/` — `src/cli.ts`, `src/providers/`, `src/auth/`
- **Provider interface**: `EmailProvider` abstract class in `src/providers/`
- **Error format**: `{ "error": { "code": "...", "message": "..." } }`

### Project Structure
- `src/cli.ts` — Commander CLI entry point
- `src/providers/` — Provider interface + GmailProvider stub
- `src/auth/` — OAuth2 + keytar integration
- `src/http/` — HTTP client with retry logic
- `src/utils/` — Shared utilities

### Gmail OAuth Details
- Redirect URI: `http://localhost:8080` (local loopback)
- Scopes: `https://www.googleapis.com/auth/gmail.readwrite`, `https://www.googleapis.com/auth/gmail.modify`

## Canonical References

- `.planning/ROADMAP.md` — Phase 1 deliverables and success criteria
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-03
- `CLAUDE.md` — Bun runtime, banned packages

## Deferred Ideas

None — Phase 1 scope is defined by the decisions above.

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04 via discuss-phase*
