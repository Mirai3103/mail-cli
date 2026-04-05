// LOG-04: Exit codes follow convention
export const ExitCode = {
	SUCCESS: 0,
	USAGE_ERROR: 1, // Invalid command line arguments, missing required options
	SERVER_ERROR: 2, // API errors, network failures, unexpected errors
	AUTH_ERROR: 3, // Authentication/authorization failures
} as const;

export type ExitCodeType = (typeof ExitCode)[keyof typeof ExitCode];
