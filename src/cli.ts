#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/index.js";
import {
	initOAuthClient,
	initOutlookClient,
} from "./infrastructure/auth/index.js";
import { setupGlobalErrorHandlers } from "./utils/error-handler.js";

// Setup global error handlers BEFORE any async operations
setupGlobalErrorHandlers();

const program = new Command();

program
	.name("mail-cli")
	.description("CLI for reading and managing email")
	.version("0.1.0");

// Register all commands
registerCommands(program);

// Initialize auth and parse
Promise.all([initOAuthClient(), initOutlookClient()])
	.then(() => {
		program.parse();
	})
	.catch((err) => {
		// Import and use handleError for auth init failures
		import("./utils/error-handler.js").then(({ handleError }) => {
			handleError(err);
		});
	});
