import { test, expect, describe, vi, beforeEach } from "bun:test";
import { AccountService } from "./account-service";
import { mockTokenStorage, mockConfig } from "../test/mocks";

describe("AccountService", () => {
	let service: AccountService;

	beforeEach(() => {
		service = new AccountService(mockTokenStorage, mockConfig);
		vi.clearAllMocks();
	});

	describe("addAccount", () => {
		test("throws error when gmail credentials not configured", async () => {
			mockConfig.loadConfig = vi.fn().mockResolvedValue({ gmail: {}, outlook: {} });
			await expect(service.addAccount("gmail")).rejects.toThrow();
		});

		test("throws error for unsupported provider", async () => {
			mockConfig.loadConfig = vi.fn().mockResolvedValue({
				gmail: { clientId: "id", clientSecret: "secret" },
			});
			await expect(service.addAccount("yahoo")).rejects.toThrow();
		});
	});

	describe("listAccounts", () => {
		test("returns accounts mapped to account/provider format", async () => {
			mockTokenStorage.listAccounts = vi.fn().mockResolvedValue([
				"user@gmail.com:gmail",
				"user@outlook.com:outlook",
			]);
			const service = new AccountService(mockTokenStorage, mockConfig);
			const result = await service.listAccounts();
			expect(result).toEqual([
				{ account: "user@gmail.com:gmail", provider: "gmail" },
				{ account: "user@outlook.com:outlook", provider: "outlook" },
			]);
		});

		test("returns empty array when no accounts", async () => {
			mockTokenStorage.listAccounts = vi.fn().mockResolvedValue([]);
			const service = new AccountService(mockTokenStorage, mockConfig);
			const result = await service.listAccounts();
			expect(result).toEqual([]);
		});
	});

	describe("removeAccount", () => {
		test("deletes tokens for account", async () => {
			mockTokenStorage.listAccounts = vi.fn().mockResolvedValue(["user@gmail.com:gmail"]);
			const service = new AccountService(mockTokenStorage, mockConfig);
			await service.removeAccount("user@gmail.com:gmail");
			expect(mockTokenStorage.deleteTokens).toHaveBeenCalledWith("user@gmail.com:gmail");
		});

		test("throws error when account not found", async () => {
			mockTokenStorage.listAccounts = vi.fn().mockResolvedValue([]);
			const service = new AccountService(mockTokenStorage, mockConfig);
			await expect(service.removeAccount("nonexistent:gmail")).rejects.toThrow();
		});

		test("returns removed account id", async () => {
			mockTokenStorage.listAccounts = vi.fn().mockResolvedValue(["user@gmail.com:gmail"]);
			const service = new AccountService(mockTokenStorage, mockConfig);
			const result = await service.removeAccount("user@gmail.com:gmail");
			expect(result).toEqual({ removed: "user@gmail.com:gmail" });
		});
	});
});
