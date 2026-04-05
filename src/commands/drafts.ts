import type { Command } from "commander";
import { draftService } from "../container.js";
import { CLIError, printError } from "../utils/errors.js";

export function registerDraftsCommand(program: Command) {
	program
		.command("drafts")
		.description("List and manage email drafts")
		.option("--account <id>", "Account ID (email:provider format)")
		.option("--list", "List all drafts for the account")
		.option("--delete <id>", "Delete a draft by ID")
		.action(async (options) => {
			try {
				// Determine account - use default or specified
				const account = options.account || "default:gmail";

				if (options.list) {
					await listDrafts(account);
				} else if (options.delete) {
					await deleteDraft(options.delete, account);
				} else {
					throw new CLIError(
						"MISSING_FLAG",
						"Either --list or --delete <id> is required",
					);
				}
			} catch (err) {
				printError(err as Error);
				process.exit(1);
			}
		});
}

async function listDrafts(account: string): Promise<void> {
	const drafts = await draftService.list(account);
	// Output format: JSON array with summary info per draft
	const output = drafts.map((d) => ({
		id: d.id,
		subject: d.subject,
		to: d.to,
		cc: d.cc,
		bcc: d.bcc,
		attachments: d.attachments,
		createdAt: d.createdAt,
		updatedAt: d.updatedAt,
	}));
	console.log(JSON.stringify(output));
}

async function deleteDraft(id: string, account: string): Promise<void> {
	const deleted = await draftService.delete(id, account);
	if (!deleted) {
		throw new CLIError("DRAFT_NOT_FOUND", `Draft with ID '${id}' not found`);
	}
	console.log(JSON.stringify({ deleted: true, id }));
}
