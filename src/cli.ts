#!/usr/bin/env bun
import { Command } from "commander";
import {
  getAccessToken,
  listAccounts,
  deleteTokens,
  saveTokens,
} from "./auth/index.js";
import { GmailProvider } from "./providers/gmail-provider.js";
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
      const provider = new GmailProvider(account);

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

// Parse and run
program.parse();
