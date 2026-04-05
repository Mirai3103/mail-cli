import { Command } from "commander";
import { createComposeService, createProvider } from "../container.js";

export function registerReplyCommand(program: Command) {
  program
    .command("reply")
    .description("Reply to an existing email (with empty body)")
    .argument("<id>", "ID of message to reply to")
    .option("--account <id>", "Account ID (email:provider format)")
    .requiredOption("--to <addresses>", "Reply recipients (comma-separated)")
    .option("--cc <addresses>", "CC recipients (comma-separated)")
    .option("--bcc <addresses>", "BCC recipients (comma-separated)")
    .action(async (id, options) => {
      try {
        const provider = await createProvider(options.account);
        const composeService = createComposeService(provider);

        const to = options.to.split(",").map((s: string) => s.trim());
        const cc = options.cc ? options.cc.split(",").map((s: string) => s.trim()) : undefined;
        const bcc = options.bcc ? options.bcc.split(",").map((s: string) => s.trim()) : undefined;

        const result = await composeService.reply(id, { to, cc, bcc });
        console.log(JSON.stringify({ id: result.id }));
      } catch (err) {
        const { printError } = await import("../utils/errors.js");
        printError(err as Error);
        process.exit(1);
      }
    });
}
