import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const REAL_HOME = os.homedir();
const TEST_CONFIG_DIR = path.join(REAL_HOME, ".emailcli");
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, "config.json");

test("getConfigPath returns path to config.json in home directory", async () => {
	const { ConfigImpl } = await import("./config.js");
	const config = new ConfigImpl();
	expect(config.getConfigPath()).toBe(
		path.join(REAL_HOME, ".emailcli", "config.json"),
	);
});

test("loadConfig reads existing config file", async () => {
	// Backup existing config
	let hadConfig = false;
	let originalContent: string | null = null;
	try {
		originalContent = await fs.readFile(TEST_CONFIG_FILE, "utf-8");
		hadConfig = true;
	} catch {}

	try {
		// Write test config
		const configData = {
			gmail: { clientId: "my-client-id", clientSecret: "my-secret" },
			outlook: { clientId: "outlook-id", clientSecret: "outlook-secret" },
		};
		await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
		await fs.writeFile(TEST_CONFIG_FILE, JSON.stringify(configData));

		const { ConfigImpl } = await import("./config.js");
		const config = new ConfigImpl();
		const result = await config.loadConfig();

		expect(result.gmail.clientId).toBe("my-client-id");
		expect(result.gmail.clientSecret).toBe("my-secret");
		expect(result.outlook.clientId).toBe("outlook-id");
	} finally {
		// Restore original config
		if (hadConfig && originalContent !== null) {
			await fs.writeFile(TEST_CONFIG_FILE, originalContent);
		} else {
			try {
				await fs.unlink(TEST_CONFIG_FILE);
			} catch {}
		}
	}
});

test("loadConfig creates default config if file does not exist", async () => {
	// Ensure directory exists
	await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });

	// Remove config if it exists
	try {
		await fs.unlink(TEST_CONFIG_FILE);
	} catch {}

	// Verify file doesn't exist
	try {
		await fs.access(TEST_CONFIG_FILE);
		throw new Error("File should not exist");
	} catch (e: any) {
		if (e.code !== "ENOENT") throw e;
	}

	const { ConfigImpl } = await import("./config.js");
	const config = new ConfigImpl();
	const result = await config.loadConfig();

	expect(result).toEqual({
		gmail: { clientId: "", clientSecret: "" },
		outlook: { clientId: "", clientSecret: "" },
	});

	// Verify file was created
	const content = await fs.readFile(TEST_CONFIG_FILE, "utf-8");
	const saved = JSON.parse(content);
	expect(saved.gmail).toEqual({ clientId: "", clientSecret: "" });

	// Cleanup - remove the created file
	try {
		await fs.unlink(TEST_CONFIG_FILE);
	} catch {}
});

test("loadConfig applies environment variable overrides", async () => {
	// Backup existing config
	let hadConfig = false;
	let originalContent: string | null = null;
	try {
		originalContent = await fs.readFile(TEST_CONFIG_FILE, "utf-8");
		hadConfig = true;
	} catch {}

	try {
		// Write empty config
		const configData = {
			gmail: { clientId: "", clientSecret: "" },
			outlook: { clientId: "", clientSecret: "" },
		};
		await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
		await fs.writeFile(TEST_CONFIG_FILE, JSON.stringify(configData));

		// Set env vars
		process.env.GMAIL_CLIENT_ID = "env-gmail-id";
		process.env.GMAIL_CLIENT_SECRET = "env-gmail-secret";
		process.env.OUTLOOK_CLIENT_ID = "env-outlook-id";
		process.env.OUTLOOK_CLIENT_SECRET = "env-outlook-secret";

		const { ConfigImpl } = await import("./config.js");
		const config = new ConfigImpl();
		const result = await config.loadConfig();

		expect(result.gmail.clientId).toBe("env-gmail-id");
		expect(result.gmail.clientSecret).toBe("env-gmail-secret");
		expect(result.outlook.clientId).toBe("env-outlook-id");
		expect(result.outlook.clientSecret).toBe("env-outlook-secret");
	} finally {
		// Clean up env vars
		delete process.env.GMAIL_CLIENT_ID;
		delete process.env.GMAIL_CLIENT_SECRET;
		delete process.env.OUTLOOK_CLIENT_ID;
		delete process.env.OUTLOOK_CLIENT_SECRET;

		// Restore original config
		if (hadConfig && originalContent !== null) {
			await fs.writeFile(TEST_CONFIG_FILE, originalContent);
		} else {
			try {
				await fs.unlink(TEST_CONFIG_FILE);
			} catch {}
		}
	}
});

test("loadConfig handles malformed JSON gracefully", async () => {
	// Backup existing config
	let hadConfig = false;
	let originalContent: string | null = null;
	try {
		originalContent = await fs.readFile(TEST_CONFIG_FILE, "utf-8");
		hadConfig = true;
	} catch {}

	try {
		// Write malformed JSON
		await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
		await fs.writeFile(TEST_CONFIG_FILE, "not valid json {{{");

		const { ConfigImpl } = await import("./config.js");
		const config = new ConfigImpl();
		const result = await config.loadConfig();

		// Should return default config when JSON parsing fails
		expect(result).toEqual({
			gmail: { clientId: "", clientSecret: "" },
			outlook: { clientId: "", clientSecret: "" },
		});
	} finally {
		// Restore original config
		if (hadConfig && originalContent !== null) {
			await fs.writeFile(TEST_CONFIG_FILE, originalContent);
		} else {
			try {
				await fs.unlink(TEST_CONFIG_FILE);
			} catch {}
		}
	}
});
