// Error code constants for consistent error handling
export const ErrorCode = {
	// Auth errors (exit 3)
	AUTH_FAILED: "AUTH_FAILED",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",
	REFRESH_FAILED: "REFRESH_FAILED",

	// Usage errors (exit 1)
	MISSING_BODY: "MISSING_BODY",
	MISSING_FLAG: "MISSING_FLAG",
	MISSING_ID: "MISSING_ID",
	INVALID_LIMIT: "INVALID_LIMIT",
	INVALID_IDS: "INVALID_IDS",
	NO_ACCOUNTS: "NO_ACCOUNTS",
	MULTIPLE_ACCOUNTS: "MULTIPLE_ACCOUNTS",
	ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
	CONFLICTING_FLAGS: "CONFLICTING_FLAGS",
	UNSUPPORTED_PROVIDER: "UNSUPPORTED_PROVIDER",
	FILE_NOT_FOUND: "FILE_NOT_FOUND",

	// Server errors (exit 2)
	INTERNAL_ERROR: "INTERNAL_ERROR",
	API_ERROR: "API_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export class CLIError extends Error {
	constructor(
		public code: string,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "CLIError";
	}

	toJSON() {
		const detailsObj = this.details ? { details: this.details } : {};
		return {
			error: {
				code: this.code,
				message: this.message,
				...detailsObj,
			},
		};
	}
}

export function printError(error: unknown): void {
	if (error instanceof CLIError) {
		console.error(JSON.stringify(error.toJSON()));
	} else if (error instanceof Error) {
		console.error(
			JSON.stringify({ error: { code: "UNKNOWN", message: error.message } }),
		);
	} else {
		console.error(
			JSON.stringify({
				error: { code: "UNKNOWN", message: "An unknown error occurred" },
			}),
		);
	}
}

// Outlook-specific error codes
// throw new CLIError("OUTLOOK_AUTH_ERROR", "Failed to authenticate with Outlook", err);
// throw new CLIError("OUTLOOK_API_ERROR", "Failed to call Outlook API: {detail}", err);
// throw new CLIError("OUTLOOK_TOKEN_REFRESH_ERROR", "Failed to refresh Outlook access token", err);
