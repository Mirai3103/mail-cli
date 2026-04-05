import type { Command } from "commander";
import { createMailboxService, createProvider } from "../container.js";
import { CLIError } from "../utils/errors.js";

export function registerListCommand(program: Command) {
	program
		.command("list")
		.description("List emails in a folder")
		.option("--account <id>", "Account ID (email:provider format)")
		.option(
			"--folder <name>",
			"Folder/label to list (default: Inbox/INBOX)",
			"Inbox",
		)
		.option(
			"--limit <number>",
			"Maximum number of emails to return (default: 20, max: 100)",
			"20",
		)
		.action(async (options) => {
			try {
				const provider = await createProvider(options.account);
				const mailboxService = createMailboxService(provider);

				const limit = parseInt(options.limit, 10);
				if (Number.isNaN(limit) || limit < 1) {
					throw new CLIError(
						"INVALID_LIMIT",
						"--limit must be a positive number",
					);
				}

				const result = await mailboxService.list(options.folder, limit);
				console.log(JSON.stringify(result));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
