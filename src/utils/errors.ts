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
		return {
			error: {
				code: this.code,
				message: this.message,
				...(this.details && { details: this.details }),
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
