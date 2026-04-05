import * as fs from "node:fs/promises";
import type { Command } from "commander";
import { createComposeService, createProvider } from "../container.js";
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
		.action(async (options) => {
			try {
				const provider = await createProvider(options.account);
				const composeService = createComposeService(provider);

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
						} catch {
							throw new CLIError(
								"FILE_NOT_FOUND",
								`Attachment file not found: ${path}`,
							);
						}
						attachments.push(path);
					}
				}

				const result = await composeService.send({
					to,
					cc,
					bcc,
					subject: options.subject,
					body,
					attachments,
				});
				console.log(JSON.stringify({ id: result.id }));
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
