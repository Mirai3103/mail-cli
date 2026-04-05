import { logger } from "../services/logger.js";
import { CLIError } from "./errors.js";
import { ExitCode } from "./exit-codes.js";

export interface ErrorResponse {
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

export function handleError(error: unknown): never {
	if (error instanceof CLIError) {
		// LOG-03: Format as JSON error response
		const response: ErrorResponse = {
			error: {
				code: error.code,
				message: error.message,
			},
		};

		// LOG-02: Output to stderr (JSON format)
		process.stderr.write(`${JSON.stringify(response)}\n`);

		// LOG-04: Exit codes - determine which one based on error code
		const exitCode = getExitCodeForError(error);
		process.exit(exitCode);
	}

	// Unexpected error
	const response: ErrorResponse = {
		error: {
			code: "INTERNAL_ERROR",
			message:
				error instanceof Error ? error.message : "An unexpected error occurred",
			stack: error instanceof Error ? error.stack : undefined,
		},
	};

	process.stderr.write(`${JSON.stringify(response)}\n`);
	process.exit(ExitCode.SERVER_ERROR);
}

function getExitCodeForError(error: CLIError): number {
	const code = error.code;

	// AUTH_ERROR (3) - Authentication/authorization failures
	if (
		code.startsWith("AUTH_") ||
		code === "TOKEN_EXPIRED" ||
		code === "REFRESH_FAILED"
	) {
		return ExitCode.AUTH_ERROR;
	}

	// USAGE_ERROR (1) - Invalid arguments, missing required options, user mistakes
	if (
		code.startsWith("MISSING_") ||
		code.startsWith("INVALID_") ||
		code === "NO_ACCOUNTS" ||
		code === "MULTIPLE_ACCOUNTS" ||
		code === "ACCOUNT_NOT_FOUND" ||
		code === "CONFLICTING_FLAGS" ||
		code === "UNSUPPORTED_PROVIDER"
	) {
		return ExitCode.USAGE_ERROR;
	}

	// SERVER_ERROR (2) - Everything else (API errors, network failures, etc.)
	return ExitCode.SERVER_ERROR;
}

export function setupGlobalErrorHandlers(): void {
	// LOG-03: Global error handler that catches unhandled exceptions
	process.on("uncaughtException", (error: Error) => {
		logger.error("Uncaught exception", {
			message: error.message,
			stack: error.stack,
		});
		handleError(error);
	});

	process.on("unhandledRejection", (reason: unknown) => {
		const message = reason instanceof Error ? reason.message : String(reason);
		const stack = reason instanceof Error ? reason.stack : undefined;
		logger.error("Unhandled rejection", { message, stack });
		handleError(reason);
	});
}
