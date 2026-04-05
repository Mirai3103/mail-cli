import * as fs from "node:fs/promises";
import type { Command } from "commander";
import {
	createComposeService,
	createProvider,
	draftService,
} from "../container.js";
import { CLIError } from "../utils/errors.js";

export function registerSendCommand(program: Command) {
	program
		.command("send")
		.description("Send a new email")
		.option("--account <id>", "Account ID (email:provider format)")
		.requiredOption(
			"--to <addresses>",
			"Recipient email addresses (comma-separated)",
		)
		.requiredOption("--subject <subject>", "Email subject")
		.option("--body <text>", "Email body text")
		.option("--body-file-path <path>", "Path to file containing email body")
		.option("--cc <addresses>", "CC recipients (comma-separated)")
		.option("--bcc <addresses>", "BCC recipients (comma-separated)")
		.option("--attach <path>", "Attachment file path (can be repeated)", [])
		.option("--save-draft", "Save the email as a draft without sending")
		.option("--draft <id>", "Load an existing draft by ID and send")
		.action(async (options) => {
			try {
				const provider = await createProvider(options.account || "default:gmail");
				const composeService = createComposeService(provider);

				// Determine account for draft operations
				const account = options.account || "default:gmail";

				// --draft <id> loads existing draft
				if (options.draft) {
					const draft = await draftService.get(options.draft, account);
					if (!draft) {
						throw new CLIError(
							"DRAFT_NOT_FOUND",
							`Draft with ID '${options.draft}' not found`,
						);
					}
					// Merge draft data with any command-line overrides
					const to = options.to
						? options.to.split(",").map((s: string) => s.trim())
						: draft.to;
					const cc = options.cc
						? options.cc.split(",").map((s: string) => s.trim())
						: draft.cc;
					const bcc = options.bcc
						? options.bcc.split(",").map((s: string) => s.trim())
						: draft.bcc;
					const subject = options.subject || draft.subject;
					let body = options.body || draft.body;

					// Allow body file to override draft body
					if (options.bodyFilePath) {
						try {
							body = await fs.readFile(
								options.bodyFilePath,
								"utf-8",
							);
						} catch {
							throw new CLIError(
								"FILE_NOT_FOUND",
								`Body file not found: ${options.bodyFilePath}`,
							);
						}
					}

					const attachments: string[] = [...draft.attachments];
					if (options.attach) {
						const attachPaths = Array.isArray(options.attach)
							? options.attach
							: [options.attach];
						for (const path of attachPaths) {
							try {
								await fs.access(path);
								attachments.push(path);
							} catch {
								throw new CLIError(
									"FILE_NOT_FOUND",
									`Attachment file not found: ${path}`,
								);
							}
						}
					}

					const result = await composeService.send({
						to,
						cc,
						bcc,
						subject,
						body,
						attachments,
					});

					// Delete the draft after successful send
					await draftService.delete(options.draft, account);

					console.log(
						JSON.stringify({ id: result.id, sent: true }),
					);
					return;
				}

				// Build send options
				let body = options.body || "";
				if (options.bodyFilePath) {
					try {
						body = await fs.readFile(options.bodyFilePath, "utf-8");
					} catch {
						throw new CLIError(
							"FILE_NOT_FOUND",
							`Body file not found: ${options.bodyFilePath}`,
						);
					}
				}

				if (!body && !options.bodyFilePath) {
					throw new CLIError(
						"MISSING_BODY",
						"Either --body or --body-file-path is required",
					);
				}

				const to = options.to.split(",").map((s: string) => s.trim());
				const cc = options.cc
					? options.cc.split(",").map((s: string) => s.trim())
					: undefined;
				const bcc = options.bcc
					? options.bcc.split(",").map((s: string) => s.trim())
					: undefined;

				const attachments: string[] = [];
				if (options.attach) {
					const attachPaths = Array.isArray(options.attach)
						? options.attach
						: [options.attach];
					for (const path of attachPaths) {
						try {
							await fs.access(path);
							attachments.push(path);
						} catch {
							throw new CLIError(
								"FILE_NOT_FOUND",
								`Attachment file not found: ${path}`,
							);
						}
					}
				}

				const sendOptions = {
					to,
					cc,
					bcc,
					subject: options.subject,
					body,
					attachments,
				};

				// --save-draft saves without sending
				if (options.saveDraft) {
					const draft = await draftService.save(sendOptions, account);
					console.log(
						JSON.stringify({ id: draft.id, saved: true }),
					);
					return;
				}

				// Normal send
				const result = await composeService.send(sendOptions);
				console.log(JSON.stringify({ id: result.id }));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
