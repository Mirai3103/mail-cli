import type { Command } from "commander";
import { createEmailService, createProvider } from "../container.js";
import { CLIError } from "../utils/errors.js";

export function registerSearchCommand(program: Command) {
	program
		.command("search")
		.description("Search emails using provider search syntax")
		.argument(
			"<query>",
			"Search query (Gmail syntax for Gmail, KQL for Outlook)",
		)
		.option("--account <id>", "Account ID (email:provider format)")
		.option(
			"--limit <number>",
			"Maximum results to return (default: 20, max: 100)",
			"20",
		)
		.action(async (query, options) => {
			try {
				const provider = await createProvider(options.account || "default:gmail");
				const emailService = createEmailService(provider);

				const limit = parseInt(options.limit, 10);
				if (Number.isNaN(limit) || limit < 1) {
					throw new CLIError(
						"INVALID_LIMIT",
						"--limit must be a positive number",
					);
				}

				const result = await emailService.search(query, limit);
				console.log(JSON.stringify(result));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
