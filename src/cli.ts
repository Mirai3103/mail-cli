#!/usr/bin/env bun
import { Command } from "commander";
import { initOAuthClient, initOutlookClient } from "./infrastructure/auth/index.js";
import { registerCommands } from "./commands/index.js";
import { printError } from "./utils/errors.js";

const program = new Command();

program
  .name("mail-cli")
  .description("CLI for reading and managing email")
  .version("0.1.0");

// Global error handlers
process.on("uncaughtException", (err) => {
  printError(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  printError(err as Error);
  process.exit(1);
});

// Register all commands
registerCommands(program);

// Initialize auth and parse
Promise.all([initOAuthClient(), initOutlookClient()])
  .then(() => {
    program.parse();
  })
  .catch((err) => {
    printError(err as Error);
    process.exit(1);
  });
