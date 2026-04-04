#!/usr/bin/env bun
import { Command } from "commander";
import {
  getAccessToken,
  listAccounts,
  deleteTokens,
  saveTokens,
} from "./auth/index.js";
import { GmailProvider } from "./providers/gmail-provider.js";
import { Email } from "./providers/email-provider.js";
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

// Account commands
program
  .command("account")
  .description("Manage email accounts")
  .addCommand(
    new Command("add")
      .description("Add a new email account")
      .requiredOption("--provider <provider>", "Email provider (gmail, outlook)")
      .action(async (options) => {
        try {
          if (options.provider !== "gmail") {
            throw new CLIError(
              "UNSUPPORTED_PROVIDER",
              `Provider '${options.provider}' is not supported. Currently only 'gmail' is supported.`
            );
          }

          // Check for required env vars
          if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
            throw new CLIError(
              "MISSING_ENV",
              "GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set"
            );
          }

          // Initiate OAuth flow
          const { tokens, email } = await getAccessToken();

          // Save tokens to keychain
          await saveTokens(email, tokens);

          // Output result as JSON
          console.log(
            JSON.stringify({ account: email, provider: options.provider })
          );
        } catch (err) {
          printError(err as Error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("list")
      .description("List all connected accounts")
      .action(async () => {
        try {
          const accounts = await listAccounts();
          const result = accounts.map((account) => ({
            account,
            provider: "gmail", // All accounts currently use Gmail
          }));
          console.log(JSON.stringify(result));
        } catch (err) {
          printError(err as Error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("remove")
      .description("Remove an email account")
      .requiredOption("--account <id>", "Account ID (email address)")
      .action(async (options) => {
        try {
          const accounts = await listAccounts();
          if (!accounts.includes(options.account)) {
            throw new CLIError(
              "ACCOUNT_NOT_FOUND",
              `Account ${options.account} not found`
            );
          }

          await deleteTokens(options.account);
          console.log(JSON.stringify({ removed: options.account }));
        } catch (err) {
          printError(err as Error);
          process.exit(1);
        }
      })
  );

// List command - NAV-01, NAV-02
program
  .command("list")
  .description("List emails in a folder")
  .option("--folder <name>", "Folder/label to list (default: INBOX)", "INBOX")
  .option("--limit <number>", "Maximum number of emails to return (default: 20, max: 100)", "20")
  .action(async (options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0]; // Use first account for now
      const provider = new GmailProvider(account!);

      const limit = parseInt(options.limit, 10);
      if (isNaN(limit) || limit < 1) {
        throw new CLIError("INVALID_LIMIT", "--limit must be a positive number");
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
  .action(async () => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

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
  .action(async () => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

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
  .option("--thread", "Read all messages in thread (use thread ID as argument)")
  .action(async (id, options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

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
  .description("Search emails using Gmail search syntax")
  .argument("<query>", "Gmail search query (e.g., 'from:foo subject:bar is:unread')")
  .option("--limit <number>", "Maximum results to return (default: 20, max: 100)", "20")
  .action(async (query, options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

      const limit = parseInt(options.limit, 10);
      if (isNaN(limit) || limit < 1) {
        throw new CLIError("INVALID_LIMIT", "--limit must be a positive number");
      }

      // D-07: Pass search query directly to Gmail (D-08: returns same fields as list)
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
  .requiredOption("--to <addresses>", "Recipient email addresses (comma-separated)")
  .requiredOption("--subject <subject>", "Email subject")
  .option("--body <text>", "Email body text")
  .option("--body-file-path <path>", "Path to file containing email body")
  .option("--cc <addresses>", "CC recipients (comma-separated)")
  .option("--bcc <addresses>", "BCC recipients (comma-separated)")
  .option("--attach <path>", "Attachment file path (can be repeated)", [])
  .action(async (options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

      // D-10: body is required for send (either --body or --body-file-path)
      let body = options.body || "";
      if (options.bodyFilePath) {
        // D-11: Read body from file using Bun.file()
        const file = Bun.file(options.bodyFilePath);
        if (!await file.exists()) {
          throw new CLIError("FILE_NOT_FOUND", `Body file not found: ${options.bodyFilePath}`);
        }
        body = await file.text();
      }

      if (!body && !options.bodyFilePath) {
        throw new CLIError("MISSING_BODY", "Either --body or --body-file-path is required");
      }

      // Parse comma-separated addresses
      const to = options.to.split(",").map((s: string) => s.trim());
      const cc = options.cc ? options.cc.split(",").map((s: string) => s.trim()) : undefined;
      const bcc = options.bcc ? options.bcc.split(",").map((s: string) => s.trim()) : undefined;

      // D-03, D-04: Validate and collect attachments
      const attachments: string[] = [];
      if (options.attach) {
        const attachPaths = Array.isArray(options.attach) ? options.attach : [options.attach];
        for (const path of attachPaths) {
          const file = Bun.file(path);
          if (!await file.exists()) {
            throw new CLIError("FILE_NOT_FOUND", `Attachment file not found: ${path}`);
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
  .requiredOption("--to <addresses>", "Reply recipients (comma-separated)")
  .option("--cc <addresses>", "CC recipients (comma-separated)")
  .option("--bcc <addresses>", "BCC recipients (comma-separated)")
  .action(async (id, options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured. Run 'mail-cli account add --provider gmail' first.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account);

      // Parse comma-separated addresses
      const to = options.to.split(",").map((s: string) => s.trim());
      const cc = options.cc ? options.cc.split(",").map((s: string) => s.trim()) : undefined;
      const bcc = options.bcc ? options.bcc.split(",").map((s: string) => s.trim()) : undefined;

      // D-15: Body is always empty for reply
      const result = await provider.reply(id, {
        to,
        cc,
        bcc,
        subject: "", // Subject is extracted from original message in provider
        body: "",    // D-15: empty body per SEND-04 spec
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
  .argument("<id>", "Email ID")
  .option("--read", "Mark as read")
  .option("--unread", "Mark as unread")
  .action(async (id, options) => {
    try {
      // D-02: Mutually exclusive --read and --unread
      if (!options.read && !options.unread) {
        throw new CLIError(
          "MISSING_FLAG",
          "Either --read or --unread must be specified"
        );
      }
      if (options.read && options.unread) {
        throw new CLIError(
          "CONFLICTING_FLAGS",
          "Cannot use both --read and --unread"
        );
      }

      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account!);
      await provider.mark(id, !!options.read);

      // D-05: Output {"ok": true}
      console.log(JSON.stringify({ ok: true }));
    } catch (err) {
      printError(err as Error);
      process.exit(1);
    }
  });

// Move command - ORG-02
program
  .command("move")
  .description("Move email to a folder/label")
  .argument("<id>", "Email ID")
  .requiredOption("--folder <name>", "Target folder/label name (provider-native)")
  .action(async (id, options) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account!);
      await provider.move(id, options.folder);

      console.log(JSON.stringify({ ok: true }));
    } catch (err) {
      printError(err as Error);
      process.exit(1);
    }
  });

// Delete command - ORG-03
program
  .command("delete")
  .description("Move email to trash")
  .argument("<id>", "Email ID")
  .action(async (id) => {
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        throw new CLIError("NO_ACCOUNTS", "No accounts configured.");
      }

      const account = accounts[0];
      const provider = new GmailProvider(account!);
      await provider.delete(id);

      console.log(JSON.stringify({ ok: true }));
    } catch (err) {
      printError(err as Error);
      process.exit(1);
    }
  });

// Parse and run
program.parse();
