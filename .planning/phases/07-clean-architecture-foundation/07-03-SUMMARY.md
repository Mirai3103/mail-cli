# Phase 7 Plan 3: Commands Layer and DI Bootstrap Summary

## One-liner
Commands layer (presentation), DI container, and thin cli.ts bootstrap - completing the clean architecture foundation refactor.

## Phase Context
- **Phase:** 07-clean-architecture-foundation
- **Plan:** 07-03
- **Tags:** [architecture] [clean-code] [di] [commands]
- **Dependency graph:**
  - requires: [07-02] (infrastructure layer)
  - provides: [commands-layer]
  - affects: [cli.ts]

## Tech Stack
- **Added:** TypeScript (all new files)
- **Patterns:** Dependency Injection container, Factory pattern, Command registration pattern

## Key Files Created/Modified

### Created
| File | Purpose |
|------|---------|
| `src/container.ts` | DI container with tokenStorage, config, accountService singletons and service factories |
| `src/commands/index.ts` | Command registration hub |
| `src/commands/list.ts` | List emails command |
| `src/commands/status.ts` | Mailbox status command |
| `src/commands/folders.ts` | List folders command |
| `src/commands/read.ts` | Read email/thread command |
| `src/commands/search.ts` | Search emails command |
| `src/commands/send.ts` | Send email command |
| `src/commands/reply.ts` | Reply to email command |
| `src/commands/mark.ts` | Mark email read/unread command |
| `src/commands/move.ts` | Move email to folder command |
| `src/commands/delete.ts` | Delete/trash email command |
| `src/commands/account.ts` | Account management commands (add, list, remove) |
| `src/commands/utils/resolve-provider.ts` | Account resolution utility |
| `src/infrastructure/auth/index.ts` | Auth re-exports for infrastructure layer |

### Modified
| File | Change |
|------|--------|
| `src/cli.ts` | Replaced 705-line monolithic cli.ts with 36-line thin bootstrap |

## Decisions Made

1. **Commands use service factories from container** - Each command gets its own provider instance via `createProvider()` and service instances via `createMailboxService()`, `createEmailService()`, `createComposeService()`. This ensures proper DI without stateless singletons for stateful providers.

2. **Commands call provider directly for mark/move/delete** - Per the plan notes, these operations call `provider.mark()`, `provider.move()`, `provider.delete()` directly rather than through services, as those operations aren't yet wrapped in services.

3. **Account command uses accountService directly** - The account command imports `accountService` from container and calls its methods directly, as it doesn't need a provider.

4. **Error handling via dynamic import in catch blocks** - Commands use `await import("../utils/errors.js")` inside catch blocks to avoid circular dependencies with CLIError.

## Metrics
- **Duration:** ~15 minutes
- **Tasks completed:** 3/3 (all tasks)
- **Files created:** 16
- **Lines added:** 593 new, 691 deleted (net: cli.ts shrunk by 669 lines)

## Verification Results
- `grep -r "from \"commander\"" src/services/ src/types/ src/infrastructure/ src/container.ts` returns nothing (PASS)
- `wc -l src/cli.ts` shows 36 lines (PASS, under 50)
- `ls src/` shows commands/, services/, types/, infrastructure/, container.ts, cli.ts (PASS)

## Commits
- `e309f0c`: feat(07-03): create commands layer, DI container, and thin cli.ts bootstrap

## Self-Check
- [x] All command files created with correct signatures
- [x] container.ts properly exports DI primitives and service factories
- [x] cli.ts reduced from 705 to 36 lines
- [x] No commander imports in services/types/infrastructure layers
- [x] Commands produce identical JSON output to original cli.ts
- [x] Commit hash verified: e309f0c exists
