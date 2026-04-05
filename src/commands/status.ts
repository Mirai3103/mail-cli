import type { Command } from "commander";
import { createMailboxService } from "../container.js";
import { resolveProvider } from "./utils/resolve-provider.js";

export function registerStatusCommand(program: Command) {
	program
		.command("status")
		.description("Get mailbox status (unread and total message counts)")
		.option("--account <id>", "Account ID (email:provider format)")
		.action(async (options) => {
			try {
				const provider = await resolveProvider(options.account);
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
