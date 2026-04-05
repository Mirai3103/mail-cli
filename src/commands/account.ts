import type { Command } from "commander";
import { accountService } from "../container.js";
import { CLIError } from "../utils/errors.js";

export function registerAccountCommand(program: Command) {
	const accountCmd = program
		.command("account")
		.description("Manage email accounts");

	accountCmd
		.command("add")
		.description("Add a new email account")
		.requiredOption("--provider <provider>", "Email provider (gmail, outlook)")
		.action(async (options) => {
			try {
				const result = await accountService.addAccount(options.provider);
				console.log(JSON.stringify(result));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});

	accountCmd
		.command("list")
		.description("List all connected accounts")
		.action(async () => {
			try {
				const accounts = await accountService.listAccounts();
				console.log(JSON.stringify(accounts));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});

	accountCmd
		.command("remove")
		.description("Remove an email account")
		.option("--account <id>", "Account ID (email:provider format)")
		.option("--all", "Remove all connected accounts")
		.action(async (options) => {
			try {
				if (!options.account && !options.all) {
					throw new CLIError(
						"MISSING_FLAG",
						"Either --account <id> or --all is required",
					);
				}
				if (options.account && options.all) {
					throw new CLIError(
						"CONFLICTING_FLAGS",
						"Cannot use both --account and --all",
					);
				}
				if (options.all) {
					const result = await accountService.removeAllAccounts();
					console.log(JSON.stringify(result));
				} else {
					const result = await accountService.removeAccount(options.account!);
					console.log(JSON.stringify(result));
				}
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
