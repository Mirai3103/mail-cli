import { test, expect, describe, vi, beforeEach } from "bun:test";
import { MailboxService } from "./mailbox-service";
import { mockEmailProvider, mockFolder } from "../test/mocks";

describe("MailboxService", () => {
	let service: MailboxService;

	beforeEach(() => {
		service = new MailboxService(mockEmailProvider);
		vi.clearAllMocks();
	});

	describe("list", () => {
		test("delegates to provider.list with folder and limit", async () => {
			await service.list("INBOX", 20);
			expect(mockEmailProvider.list).toHaveBeenCalledWith("INBOX", 20);
		});

		test("returns result from provider", async () => {
			const mockResult = { emails: [], nextPageToken: undefined };
			mockEmailProvider.list = vi.fn().mockResolvedValue(mockResult);
			const service = new MailboxService(mockEmailProvider);
			const result = await service.list("INBOX", 20);
			expect(result).toEqual(mockResult);
		});

		test("uses default folder when not specified", async () => {
			await service.list();
			expect(mockEmailProvider.list).toHaveBeenCalledWith("INBOX", 20);
		});
	});

	describe("status", () => {
		test("delegates to provider.status", async () => {
			await service.status();
			expect(mockEmailProvider.status).toHaveBeenCalled();
		});

		test("returns status from provider", async () => {
			const mockStatus = { unread: 10, total: 50 };
			mockEmailProvider.status = vi.fn().mockResolvedValue(mockStatus);
			const service = new MailboxService(mockEmailProvider);
			const result = await service.status();
			expect(result).toEqual(mockStatus);
		});
	});

	describe("listFolders", () => {
		test("delegates to provider.listFolders", async () => {
			await service.listFolders();
			expect(mockEmailProvider.listFolders).toHaveBeenCalled();
		});

		test("returns folders from provider", async () => {
			const mockFolders = [mockFolder];
			mockEmailProvider.listFolders = vi.fn().mockResolvedValue(mockFolders);
			const service = new MailboxService(mockEmailProvider);
			const result = await service.listFolders();
			expect(result).toEqual(mockFolders);
		});
	});
});
