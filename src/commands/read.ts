import { Command } from "commander";
import { createEmailService, createProvider } from "../container.js";

export function registerReadCommand(program: Command) {
  program
    .command("read")
    .description("Read a single email or thread")
    .argument("<id>", "Email ID or thread ID")
    .option("--account <id>", "Account ID (email:provider format)")
    .option("--thread", "Read all messages in thread (use thread ID as argument)")
    .action(async (id, options) => {
      try {
        const provider = await createProvider(options.account);
        const emailService = createEmailService(provider);

        let result;
        if (options.thread) {
          result = await emailService.readThread(id);
        } else {
          result = await emailService.read(id);
        }

        console.log(JSON.stringify(result));
      } catch (err) {
        const { printError } = await import("../utils/errors.js");
        printError(err as Error);
        process.exit(1);
      }
    });
}
