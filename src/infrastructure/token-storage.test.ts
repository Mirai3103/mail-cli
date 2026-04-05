import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const REAL_HOME = os.homedir();
const TEST_TOKENS_DIR = path.join(REAL_HOME, ".emailcli", "tokens");

describe("TokenStorageImpl (integration)", () => {
	// Use unique subdirectory for each test to avoid collisions
	const testSubDir = "test-" + Math.random().toString(36).slice(2);
	const testEmailPrefix = testSubDir + "-";
	let storage: InstanceType<typeof import("./token-storage").TokenStorageImpl>;

	beforeEach(async () => {
		// Create test subdirectory
		await fs.mkdir(path.join(TEST_TOKENS_DIR, testSubDir), { recursive: true });

		// Import fresh instance
		const { TokenStorageImpl } = await import("./token-storage.js");
		storage = new TokenStorageImpl();
	});

	afterEach(async () => {
		// Cleanup test subdirectory
		try {
			await fs.rm(path.join(TEST_TOKENS_DIR, testSubDir), { recursive: true, force: true });
		} catch {
			// Ignore
		}
	});

	test("saveTokens writes JSON file to tokens directory", async () => {
		const email = testEmailPrefix + "save@example.com";
		const tokens = { access_token: "abc123", refresh_token: "xyz789" };

		await storage.saveTokens(email, tokens);

		const tokenPath = path.join(TEST_TOKENS_DIR, email + ".json");
		const content = await fs.readFile(tokenPath, "utf-8");
		const saved = JSON.parse(content);
		expect(saved.access_token).toBe("abc123");
		expect(saved.refresh_token).toBe("xyz789");
	});

	test("getTokens returns parsed tokens for existing account", async () => {
		const email = testEmailPrefix + "get@example.com";
		const tokens = { access_token: "token-abc", refresh_token: "token-xyz" };

		await storage.saveTokens(email, tokens);
		const result = await storage.getTokens(email);
		expect(result).toEqual(tokens);
	});

	test("getTokens returns null for non-existent account", async () => {
		const result = await storage.getTokens(testEmailPrefix + "nonexistent-" + Date.now() + "@example.com");
		expect(result).toBeNull();
	});

	test("deleteTokens removes the file", async () => {
		const email = testEmailPrefix + "delete@example.com";
		const tokenPath = path.join(TEST_TOKENS_DIR, email + ".json");

		await storage.saveTokens(email, { access_token: "delete-me" });

		// Verify file exists
		await fs.access(tokenPath);

		// Delete
		await storage.deleteTokens(email);

		// Verify file no longer exists
		await expect(fs.access(tokenPath)).rejects.toThrow();
	});

	test("deleteTokens does not throw for non-existent file", async () => {
		await expect(storage.deleteTokens(testEmailPrefix + "nonexistent-" + Date.now() + "@example.com")).resolves.toBeUndefined();
	});

	test("listAccounts returns all account IDs from tokens directory", async () => {
		await storage.saveTokens(testEmailPrefix + "user1@example.com", { access_token: "a" });
		await storage.saveTokens(testEmailPrefix + "user2@example.com", { access_token: "b" });

		const accounts = await storage.listAccounts();
		// Should contain our test accounts
		expect(accounts).toContain(testEmailPrefix + "user1@example.com");
		expect(accounts).toContain(testEmailPrefix + "user2@example.com");
	});
});
