import { Command } from "commander";
import { createMailboxService, createProvider } from "../container.js";

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Get mailbox status (unread and total message counts)")
    .option("--account <id>", "Account ID (email:provider format)")
    .action(async (options) => {
      try {
        const provider = await createProvider(options.account);
        const mailboxService = createMailboxService(provider);
        const result = await mailboxService.status();
        console.log(JSON.stringify(result));
      } catch (err) {
        const { printError } = await import("../utils/errors.js");
        printError(err as Error);
        process.exit(1);
      }
    });
}
