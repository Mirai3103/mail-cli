import type { Command } from "commander";
import { createEmailService, createProvider } from "../container.js";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Email } from "../types/domain.js";

export function registerReadCommand(program: Command) {
	program
		.command("read")
		.description("Read a single email or thread")
		.argument("<id>", "Email ID or thread ID")
		.option("--account <id>", "Account ID (email:provider format)")
		.option(
			"--thread",
			"Read all messages in thread (use thread ID as argument)",
		)
		.option(
			"--download [dir]",
			"Download attachments to specified directory (or current directory if no path given)",
		)
		.action(async (id, options) => {
			try {
				const provider = await createProvider(options.account || "default:gmail");
				const emailService = createEmailService(provider);

				let result: unknown;
				if (options.thread) {
					result = await emailService.readThread(id);
				} else {
					result = await emailService.read(id);
				}

				// Handle attachment download if --download flag is set
				if (options.download) {
					const email = result as Email;
					const targetDir =
						typeof options.download === "string"
							? options.download
							: ".";

					// Ensure directory exists
					await mkdir(targetDir, { recursive: true });

					// Download each attachment
					const downloadResults: {
						filename: string;
						path: string;
						size: number;
					}[] = [];
					for (const attachment of email.attachments || []) {
						const downloadResult =
							await provider.downloadAttachment(
								email.id,
								attachment.id,
								attachment.filename,
							);

						// Sanitize filename to prevent path traversal
						const safeFilename = attachment.filename.replace(
							/[/\\]/g,
							"_",
						);
						const filePath = resolve(targetDir, safeFilename);

						// Write attachment content to disk using Bun.write for streaming
						await Bun.write(filePath, downloadResult.content);

						downloadResults.push({
							filename: attachment.filename,
							path: filePath,
							size: downloadResult.size,
						});
					}

					// Output JSON with email and download info
					console.log(
						JSON.stringify({
							email: result,
							downloads: downloadResults,
						}),
					);
				} else {
					console.log(JSON.stringify(result));
				}
			} catch (err) {
				const { printError } = await import("../utils/errors.js");
				printError(err as Error);
				process.exit(1);
			}
		});
}
