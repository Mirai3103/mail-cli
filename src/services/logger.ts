import process from "node:process";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	context?: Record<string, unknown>;
}

const levelNames: Record<LogLevel, string> = {
	[LogLevel.DEBUG]: "DEBUG",
	[LogLevel.INFO]: "INFO",
	[LogLevel.WARN]: "WARN",
	[LogLevel.ERROR]: "ERROR",
};

export class Logger {
	constructor(private minLevel: LogLevel = LogLevel.INFO) {}

	debug(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.DEBUG, message, context);
	}

	info(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.INFO, message, context);
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.WARN, message, context);
	}

	error(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.ERROR, message, context);
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	): void {
		if (level < this.minLevel) return;

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: levelNames[level],
			message,
			...(context && { context }),
		};

		// LOG-02: Log output is JSON format written to stderr (stdout untouched for data)
		process.stderr.write(`${JSON.stringify(entry)}\n`);
	}

	setLevel(level: LogLevel): void {
		this.minLevel = level;
	}
}

// Singleton instance for app-wide logging
export const logger = new Logger();
