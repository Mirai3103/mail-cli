import { test, expect, describe, vi, beforeEach } from "bun:test";
import { EmailService } from "./email-service";
import { mockEmail, mockEmailProvider } from "../test/mocks";

describe("EmailService", () => {
	let service: EmailService;

	beforeEach(() => {
		service = new EmailService(mockEmailProvider);
		vi.clearAllMocks();
	});

	describe("read", () => {
		test("delegates to provider.read with id", async () => {
			await service.read("msg-123");
			expect(mockEmailProvider.read).toHaveBeenCalledWith("msg-123");
		});

		test("returns email from provider", async () => {
			const result = await service.read("msg-123");
			expect(result).toEqual(mockEmail);
		});
	});

	describe("readThread", () => {
		test("delegates to provider.readThread with id", async () => {
			await service.readThread("thread-456");
			expect(mockEmailProvider.readThread).toHaveBeenCalledWith("thread-456");
		});

		test("returns thread messages from provider", async () => {
			const mockThread = [mockEmail, { ...mockEmail, id: "msg-124" }];
			mockEmailProvider.readThread = vi.fn().mockResolvedValue(mockThread);
			const service = new EmailService(mockEmailProvider);
			const result = await service.readThread("thread-456");
			expect(result).toEqual(mockThread);
		});
	});

	describe("search", () => {
		test("delegates to provider.search with query and limit", async () => {
			await service.search("from:sender@example.com", 20);
			expect(mockEmailProvider.search).toHaveBeenCalledWith("from:sender@example.com", 20);
		});

		test("returns search results from provider", async () => {
			const mockResults = [mockEmail];
			mockEmailProvider.search = vi.fn().mockResolvedValue(mockResults);
			const service = new EmailService(mockEmailProvider);
			const result = await service.search("test query", 10);
			expect(result).toEqual(mockResults);
		});

		test("uses default limit when not specified", async () => {
			await service.search("test");
			expect(mockEmailProvider.search).toHaveBeenCalledWith("test", 20);
		});
	});
});
