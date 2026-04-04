import * as os from "node:os";
import * as path from "node:path";

/**
 * Config schema per D-07.
 * Stores OAuth client credentials for Gmail and Outlook providers.
 */
export interface Config {
	gmail: {
		clientId: string;
		clientSecret: string;
	};
	outlook: {
		clientId: string;
		clientSecret: string;
	};
}

/**
 * Default config with empty values.
 * Used when config file does not exist (auto-created per D-05).
 */
const DEFAULT_CONFIG: Config = {
	gmail: { clientId: "", clientSecret: "" },
	outlook: { clientId: "", clientSecret: "" },
};

/**
 * Returns the path to the config file: ~/.emailcli/config.json
 */
export function getConfigPath(): string {
	return path.join(os.homedir(), ".emailcli", "config.json");
}

/**
 * Ensures the ~/.emailcli/ directory exists.
 * Creates it if it doesn't exist using Bun's file API.
 */
export async function ensureConfigDir(): Promise<void> {
	const configPath = getConfigPath();
	const configDir = path.dirname(configPath);

	// Check if directory exists using Bun.file
	const dirFile = Bun.file(configDir);
	if (!(await dirFile.exists())) {
		// Create directory structure
		await Bun.write(configDir, "");
		// Note: Bun.file for a directory doesn't work for creation
		// Use Bun's mkdir equivalent via write to empty path
		try {
			await Bun.write(configDir + "/.keep", "");
		} catch {
			// Directory creation may have already happened
		}
	}
}

/**
 * Loads configuration from ~/.emailcli/config.json with environment variable override support.
 *
 * Per D-05: Config file is auto-created with empty values if not present
 * Per D-06: Environment variables override config file values:
 *   - GMAIL_CLIENT_ID overrides config.gmail.clientId
 *   - GMAIL_CLIENT_SECRET overrides config.gmail.clientSecret
 *   - OUTLOOK_CLIENT_ID overrides config.outlook.clientId
 *   - OUTLOOK_CLIENT_SECRET overrides config.outlook.clientSecret
 */
export async function loadConfig(): Promise<Config> {
	const configPath = getConfigPath();

	// Check if config file exists
	const configFile = Bun.file(configPath);
	let config: Config;

	if (!(await configFile.exists())) {
		// Auto-create config file with default empty schema (D-05)
		config = { ...DEFAULT_CONFIG };
		await Bun.write(configPath, JSON.stringify(config, null, 2));
	} else {
		// Read existing config
		const content = await configFile.text();
		try {
			config = JSON.parse(content) as Config;
		} catch {
			// If parsing fails, use default config
			config = { ...DEFAULT_CONFIG };
		}
	}

	// Apply environment variable overrides (D-06)
	if (process.env.GMAIL_CLIENT_ID) {
		config.gmail.clientId = process.env.GMAIL_CLIENT_ID;
	}
	if (process.env.GMAIL_CLIENT_SECRET) {
		config.gmail.clientSecret = process.env.GMAIL_CLIENT_SECRET;
	}
	if (process.env.OUTLOOK_CLIENT_ID) {
		config.outlook.clientId = process.env.OUTLOOK_CLIENT_ID;
	}
	if (process.env.OUTLOOK_CLIENT_SECRET) {
		config.outlook.clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
	}

	return config;
}
