import type { Command } from "commander";
import { createProvider } from "../container.js";
import { CLIError } from "../utils/errors.js";

export function registerMarkCommand(program: Command) {
	program
		.command("mark")
		.description("Mark email as read or unread")
		.argument("[id]", "Email ID (use --ids for batch)")
		.option("--account <id>", "Account ID (email:provider format)")
		.option(
			"--ids <list>",
			"Comma-separated list of email IDs (e.g., --ids 1,2,3)",
		)
		.option("--read", "Mark as read")
		.option("--unread", "Mark as unread")
		.action(async (id, options) => {
			try {
				if (!options.read && !options.unread) {
					throw new CLIError(
						"MISSING_FLAG",
						"Either --read or --unread must be specified",
					);
				}
				if (options.read && options.unread) {
					throw new CLIError(
						"CONFLICTING_FLAGS",
						"Cannot use both --read and --unread",
					);
				}

				const provider = await createProvider(options.account);
				const isRead = !!options.read;

				let ids: string[] = [];
				if (options.ids) {
					ids = options.ids
						.split(",")
						.map((s: string) => s.trim())
						.filter(Boolean);
					if (ids.length === 0) {
						throw new CLIError(
							"INVALID_IDS",
							"--ids must contain at least one ID",
						);
					}
				} else if (id) {
					ids = [id];
				} else {
					throw new CLIError("MISSING_ID", "Either <id> or --ids is required");
				}

				const failed: Array<{
					id: string;
					error: { code: string; message: string };
				}> = [];
				for (const emailId of ids) {
					try {
						await provider.mark(emailId, isRead);
					} catch (err) {
						if (err instanceof CLIError) {
							failed.push({
								id: emailId,
								error: { code: err.code, message: err.message },
							});
						} else {
							failed.push({
								id: emailId,
								error: { code: "UNKNOWN", message: (err as Error).message },
							});
						}
					}
				}

				if (failed.length === 0) {
					console.log(JSON.stringify({ ok: true }));
				} else {
					console.log(JSON.stringify({ ok: true, failed }));
				}
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
