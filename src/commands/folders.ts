import { Command } from "commander";
import { createMailboxService, createProvider } from "../container.js";

export function registerFoldersCommand(program: Command) {
  program
    .command("folders")
    .description("List all available folders/labels")
    .option("--account <id>", "Account ID (email:provider format)")
    .action(async (options) => {
      try {
        const provider = await createProvider(options.account);
        const mailboxService = createMailboxService(provider);
        const result = await mailboxService.listFolders();
        console.log(JSON.stringify(result));
      } catch (err) {
        const { printError } = await import("../utils/errors.js");
        printError(err as Error);
        process.exit(1);
      }
    });
}
