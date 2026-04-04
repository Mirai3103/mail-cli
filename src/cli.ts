#!/usr/bin/env node
import { Command, Option } from "commander";
import { loadConfig } from "./utils/index.js";
import {
	getAccessToken,
	listAccounts,
	deleteTokens,
	saveTokens,
} from "./auth/index.js";
import { GmailProvider } from "./providers/gmail-provider.js";
import { OutlookProvider } from "./providers/outlook-provider.js";
import { getOutlookAuthToken } from "./auth/outlook-oauth.js";
import type { Email } from "./providers/email-provider.js";
import { CLIError, printError } from "./utils/errors.js";

const program = new Command();

program
	.name("mail-cli")
	.description("CLI for reading and managing email")
	.version("0.1.0");

// Global error handler
process.on("uncaughtException", (err) => {
	printError(err);
	process.exit(1);
});

process.on("unhandledRejection", (err) => {
	printError(err as Error);
	process.exit(1);
});

/**
 * Resolve the provider based on account flag.
 * Per D-08, D-09, D-10: single account auto-select, multiple accounts require --account.
 */
async function resolveProvider(
	accountFlag?: string,
): Promise<GmailProvider | OutlookProvider> {
	const accounts = await listAccounts();

	let account: string;
	if (!accountFlag) {
		if (accounts.length === 0) {
			throw new CLIError(
				"NO_ACCOUNTS",
				"No accounts configured. Run 'mail-cli account add --provider gmail' first.",
			);
		}
		if (accounts.length === 1) {
			account = accounts[0];
		} else {
			throw new CLIError(
				"MULTIPLE_ACCOUNTS",
				`Multiple accounts found. Use --account to specify one of: ${accounts.join(", ")}`,
			);
		}
	} else {
		if (!accounts.includes(accountFlag)) {
			throw new CLIError(
				"ACCOUNT_NOT_FOUND",
				`Account ${accountFlag} not found. Available: ${accounts.join(", ")}`,
			);
		}
		account = accountFlag;
	}

	// Parse provider from account suffix (D-07: email:provider format)
	// Gmail: "me@gmail.com:gmail" -> provider=gmail
	// Outlook: "me@outlook.com:outlook" -> provider=outlook
	if (account.endsWith(":gmail")) {
		return new GmailProvider(account);
	} else if (account.endsWith(":outlook")) {
		return new OutlookProvider(account);
	} else {
		// Backwards compat: assume Gmail for accounts without suffix
		return new GmailProvider(account);
	}
}

/**
 * Determine provider from account suffix.
 */
function getProviderFromAccount(account: string): string {
	if (account.endsWith(":gmail")) return "gmail";
	if (account.endsWith(":outlook")) return "outlook";
	return "gmail"; // backwards compat
}

// Account commands
program
	.command("account")
	.description("Manage email accounts")
	.addCommand(
		new Command("add")
			.description("Add a new email account")
			.requiredOption(
				"--provider <provider>",
				"Email provider (gmail, outlook)",
			)
			.action(async (options) => {
				try {
					if (options.provider === "gmail") {
						const config = await loadConfig();
						if (!config.gmail.clientId || !config.gmail.clientSecret) {
							throw new CLIError(
								"MISSING_ENV",
								"Gmail credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET env vars, or configure ~/.emailcli/config.json",
							);
						}

						// Initiate OAuth flow
						const { tokens, email } = await getAccessToken();

						// Save tokens to keychain
						await saveTokens(email, tokens);

						// Output result as JSON
						console.log(
							JSON.stringify({ account: `${email}:gmail`, provider: "gmail" }),
						);
					} else if (options.provider === "outlook") {
						const config = await loadConfig();
						if (!config.outlook.clientId || !config.outlook.clientSecret) {
							throw new CLIError(
								"MISSING_ENV",
								"Outlook credentials not configured. Set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET env vars, or configure ~/.emailcli/config.json",
							);
						}

						// Device code flow will prompt for email
						// We need to get the email after auth
						const pca = await import("@azure/msal-node").then(
							(m) => new m.PublicClientApplication({
								auth: {
									clientId: config.outlook.clientId,
								},
							}),
						);

						const result = await pca.acquireTokenByDeviceCode({
							deviceCodeCallback: (response: { message: string }) => {
								console.log(response.message);
							},
							scopes: [
								"Mail.Read",
								"Mail.Send",
								"Mail.ReadBasic",
								"User.Read",
								"offline_access",
							],
						});

						if (result && result.account) {
							const email =
								result.account.username ||
								(await fetch("https://graph.microsoft.com/v1.0/me", {
									headers: {
										Authorization: `Bearer ${result.accessToken}`,
									},
								}).then((r) => r.json()).then((d) => d.mail || d.userPrincipalName));

							// Save tokens with provider suffix
							const keytarAccount = `${email}:outlook`;
							await saveTokens(keytarAccount, {
								accessToken: result.accessToken,
								refreshToken:
									result.account.idTokenClaims?.oid || "",
								expiresAt: result.expiresOn?.getTime(),
								tenantId: result.tenantId,
								homeAccountId: result.account.homeAccountId,
								localAccountId: result.account.localAccountId,
							});

							console.log(
								JSON.stringify({
									account: keytarAccount,
									provider: "outlook",
								}),
							);
						}
					} else {
						throw new CLIError(
							"UNSUPPORTED_PROVIDER",
							`Provider '${options.provider}' is not supported. Use 'gmail' or 'outlook'.`,
						);
					}
				} catch (err) {
					printError(err as Error);
					process.exit(1);
				}
			}),
	)
	.addCommand(
		new Command("list")
			.description("List all connected accounts")
			.action(async () => {
				try {
					const accounts = await listAccounts();
					const result = accounts.map((account) => ({
						account,
						provider: getProviderFromAccount(account),
					}));
					console.log(JSON.stringify(result));
				} catch (err) {
					printError(err as Error);
					process.exit(1);
				}
			}),
	)
	.addCommand(
		new Command("remove")
			.description("Remove an email account")
			.requiredOption("--account <id>", "Account ID (email:provider format)")
			.action(async (options) => {
				try {
					const accounts = await listAccounts();
					if (!accounts.includes(options.account)) {
						throw new CLIError(
							"ACCOUNT_NOT_FOUND",
							`Account ${options.account} not found`,
						);
					}

					await deleteTokens(options.account);
					console.log(JSON.stringify({ removed: options.account }));
				} catch (err) {
					printError(err as Error);
					process.exit(1);
				}
			}),
	);

// List command - NAV-01, NAV-02
program
	.command("list")
	.description("List emails in a folder")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option("--folder <name>", "Folder/label to list (default: Inbox/INBOX)", "Inbox")
	.option(
		"--limit <number>",
		"Maximum number of emails to return (default: 20, max: 100)",
		"20",
	)
	.action(async (options) => {
		try {
			const provider = await resolveProvider(options.account);

			const limit = parseInt(options.limit, 10);
			if (isNaN(limit) || limit < 1) {
				throw new CLIError(
					"INVALID_LIMIT",
					"--limit must be a positive number",
				);
			}

			const result = await provider.list(options.folder, limit);

			// Output per D-01: id, from, subject, date, flags only
			// Output per D-05: include nextPageToken in response metadata
			console.log(JSON.stringify(result));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Status command - NAV-03
program
	.command("status")
	.description("Get mailbox status (unread and total message counts)")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.action(async (options) => {
		try {
			const provider = await resolveProvider(options.account);

			const status = await provider.status();

			// Output per D-09: {unread, total}
			console.log(JSON.stringify(status));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Folders command - ORG-04
program
	.command("folders")
	.description("List all available folders/labels")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.action(async (options) => {
		try {
			const provider = await resolveProvider(options.account);

			const folders = await provider.listFolders();

			// Output per D-06, D-07, D-08: flat list with {id, name, type}
			console.log(JSON.stringify(folders));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Read command - READ-01, READ-02
program
	.command("read")
	.description("Read a single email or thread")
	.argument("<id>", "Email ID or thread ID")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option("--thread", "Read all messages in thread (use thread ID as argument)")
	.action(async (id, options) => {
		try {
			const provider = await resolveProvider(options.account);

			let result: Email | Email[];
			if (options.thread) {
				// D-05: read --thread returns all messages in thread as JSON array
				result = await provider.readThread(id);
			} else {
				// D-03: read <id> returns full Email object
				result = await provider.read(id);
			}

			console.log(JSON.stringify(result));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Search command - SCH-01, SCH-02
program
	.command("search")
	.description("Search emails using provider search syntax")
	.argument(
		"<query>",
		"Search query (Gmail syntax for Gmail, KQL for Outlook)",
	)
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option(
		"--limit <number>",
		"Maximum results to return (default: 20, max: 100)",
		"20",
	)
	.action(async (query, options) => {
		try {
			const provider = await resolveProvider(options.account);

			const limit = parseInt(options.limit, 10);
			if (isNaN(limit) || limit < 1) {
				throw new CLIError(
					"INVALID_LIMIT",
					"--limit must be a positive number",
				);
			}

			// D-07: Pass search query directly to provider (D-08: returns same fields as list)
			const result = await provider.search(query, limit);

			console.log(JSON.stringify(result));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Send command - SEND-01, SEND-02, SEND-03
program
	.command("send")
	.description("Send a new email")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
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
			const provider = await resolveProvider(options.account);

			// D-10: body is required for send (either --body or --body-file-path)
			let body = options.body || "";
			if (options.bodyFilePath) {
				// D-11: Read body from file using Bun.file()
				const file = Bun.file(options.bodyFilePath);
				if (!(await file.exists())) {
					throw new CLIError(
						"FILE_NOT_FOUND",
						`Body file not found: ${options.bodyFilePath}`,
					);
				}
				body = await file.text();
			}

			if (!body && !options.bodyFilePath) {
				throw new CLIError(
					"MISSING_BODY",
					"Either --body or --body-file-path is required",
				);
			}

			// Parse comma-separated addresses
			const to = options.to.split(",").map((s: string) => s.trim());
			const cc = options.cc
				? options.cc.split(",").map((s: string) => s.trim())
				: undefined;
			const bcc = options.bcc
				? options.bcc.split(",").map((s: string) => s.trim())
				: undefined;

			// D-03, D-04: Validate and collect attachments
			const attachments: string[] = [];
			if (options.attach) {
				const attachPaths = Array.isArray(options.attach)
					? options.attach
					: [options.attach];
				for (const path of attachPaths) {
					const file = Bun.file(path);
					if (!(await file.exists())) {
						throw new CLIError(
							"FILE_NOT_FOUND",
							`Attachment file not found: ${path}`,
						);
					}
					attachments.push(path);
				}
			}

			const result = await provider.send({
				to,
				cc,
				bcc,
				subject: options.subject,
				body,
				attachments,
			});

			// Return the sent message ID
			console.log(JSON.stringify({ id: result }));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Reply command - SEND-04
program
	.command("reply")
	.description("Reply to an existing email (with empty body)")
	.argument("<id>", "ID of message to reply to")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.requiredOption("--to <addresses>", "Reply recipients (comma-separated)")
	.option("--cc <addresses>", "CC recipients (comma-separated)")
	.option("--bcc <addresses>", "BCC recipients (comma-separated)")
	.action(async (id, options) => {
		try {
			const provider = await resolveProvider(options.account);

			// Parse comma-separated addresses
			const to = options.to.split(",").map((s: string) => s.trim());
			const cc = options.cc
				? options.cc.split(",").map((s: string) => s.trim())
				: undefined;
			const bcc = options.bcc
				? options.bcc.split(",").map((s: string) => s.trim())
				: undefined;

			// D-15: Body is always empty for reply
			const result = await provider.reply(id, {
				to,
				cc,
				bcc,
				subject: "", // Subject is extracted from original message in provider
				body: "", // D-15: empty body per SEND-04 spec
			});

			// Return the sent message ID
			console.log(JSON.stringify({ id: result }));
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Mark command - ORG-01
program
	.command("mark")
	.description("Mark email as read or unread")
	.argument("[id]", "Email ID (use --ids for batch)")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option("--ids <list>", "Comma-separated list of email IDs (e.g., --ids 1,2,3)")
	.option("--read", "Mark as read")
	.option("--unread", "Mark as unread")
	.action(async (id, options) => {
		try {
			// D-02: Mutually exclusive --read and --unread
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

			const provider = await resolveProvider(options.account);
			const isRead = !!options.read;

			// D-01: Parse --ids into array
			let ids: string[] = [];
			if (options.ids) {
				ids = options.ids.split(",").map((s: string) => s.trim()).filter(Boolean);
				if (ids.length === 0) {
					throw new CLIError("INVALID_IDS", "--ids must contain at least one ID");
				}
			} else if (id) {
				ids = [id];
			} else {
				throw new CLIError("MISSING_ID", "Either <id> or --ids is required");
			}

			// D-02: Batch operation with partial failure tracking
			const failed: Array<{id: string; error: {code: string; message: string}}> = [];
			for (const emailId of ids) {
				try {
					await provider.mark(emailId, isRead);
				} catch (err) {
					if (err instanceof CLIError) {
						failed.push({ id: emailId, error: { code: err.code, message: err.message } });
					} else {
						failed.push({ id: emailId, error: { code: "UNKNOWN", message: (err as Error).message } });
					}
				}
			}

			// D-02, D-03: Output format
			if (failed.length === 0) {
				console.log(JSON.stringify({ ok: true }));
			} else {
				console.log(JSON.stringify({ ok: true, failed }));
			}
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Move command - ORG-02
program
	.command("move")
	.description("Move email to a folder/label")
	.argument("[id]", "Email ID (use --ids for batch)")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option("--ids <list>", "Comma-separated list of email IDs (e.g., --ids 1,2,3)")
	.requiredOption(
		"--folder <name>",
		"Target folder/label name (provider-native)",
	)
	.action(async (id, options) => {
		try {
			const provider = await resolveProvider(options.account);

			// D-01: Parse --ids into array
			let ids: string[] = [];
			if (options.ids) {
				ids = options.ids.split(",").map((s: string) => s.trim()).filter(Boolean);
				if (ids.length === 0) {
					throw new CLIError("INVALID_IDS", "--ids must contain at least one ID");
				}
			} else if (id) {
				ids = [id];
			} else {
				throw new CLIError("MISSING_ID", "Either <id> or --ids is required");
			}

			// D-02: Batch operation with partial failure tracking
			const failed: Array<{id: string; error: {code: string; message: string}}> = [];
			for (const emailId of ids) {
				try {
					await provider.move(emailId, options.folder);
				} catch (err) {
					if (err instanceof CLIError) {
						failed.push({ id: emailId, error: { code: err.code, message: err.message } });
					} else {
						failed.push({ id: emailId, error: { code: "UNKNOWN", message: (err as Error).message } });
					}
				}
			}

			// D-02, D-03: Output format
			if (failed.length === 0) {
				console.log(JSON.stringify({ ok: true }));
			} else {
				console.log(JSON.stringify({ ok: true, failed }));
			}
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Delete command - ORG-03
program
	.command("delete")
	.description("Move email to trash")
	.argument("[id]", "Email ID (use --ids for batch)")
	.option(
		"--account <id>",
		"Account ID (email:provider format)",
	)
	.option("--ids <list>", "Comma-separated list of email IDs (e.g., --ids 1,2,3)")
	.action(async (id, options) => {
		try {
			const provider = await resolveProvider(options.account);

			// D-01: Parse --ids into array
			let ids: string[] = [];
			if (options.ids) {
				ids = options.ids.split(",").map((s: string) => s.trim()).filter(Boolean);
				if (ids.length === 0) {
					throw new CLIError("INVALID_IDS", "--ids must contain at least one ID");
				}
			} else if (id) {
				ids = [id];
			} else {
				throw new CLIError("MISSING_ID", "Either <id> or --ids is required");
			}

			// D-02: Batch operation with partial failure tracking
			const failed: Array<{id: string; error: {code: string; message: string}}> = [];
			for (const emailId of ids) {
				try {
					await provider.delete(emailId);
				} catch (err) {
					if (err instanceof CLIError) {
						failed.push({ id: emailId, error: { code: err.code, message: err.message } });
					} else {
						failed.push({ id: emailId, error: { code: "UNKNOWN", message: (err as Error).message } });
					}
				}
			}

			// D-02, D-03: Output format
			if (failed.length === 0) {
				console.log(JSON.stringify({ ok: true }));
			} else {
				console.log(JSON.stringify({ ok: true, failed }));
			}
		} catch (err) {
			printError(err as Error);
			process.exit(1);
		}
	});

// Parse and run
program.parse();
