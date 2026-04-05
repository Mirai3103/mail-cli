import { vi } from "bun:test";
import type { Email, Folder } from "../types/domain.js";
import type {
	ConfigPort,
	EmailProviderPort,
	TokenStoragePort,
} from "../types/ports.js";

// Shared mock data
export const mockEmail: Email = {
	id: "msg-123",
	threadId: "thread-456",
	from: "sender@example.com",
	to: ["recipient@example.com"],
	subject: "Test Subject",
	date: "2026-04-05T10:00:00Z",
	body: "Test body content",
	flags: ["\\Seen"],
	attachments: [],
};

export const mockFolder: Folder = {
	id: "INBOX",
	name: "INBOX",
	type: "inbox",
};

// Mock EmailProviderPort
export const mockEmailProvider: EmailProviderPort = {
	account: "test:gmail",
	authenticate: vi.fn().mockResolvedValue(undefined),
	getAuthToken: vi.fn().mockResolvedValue("mock-auth-token"),
	list: vi.fn().mockResolvedValue({ emails: [], nextPageToken: undefined }),
	read: vi.fn().mockResolvedValue(mockEmail),
	readThread: vi.fn().mockResolvedValue([mockEmail]),
	search: vi.fn().mockResolvedValue([mockEmail]),
	send: vi.fn().mockResolvedValue("msg-id-123"),
	reply: vi.fn().mockResolvedValue("reply-id-456"),
	mark: vi.fn().mockResolvedValue(undefined),
	move: vi.fn().mockResolvedValue(undefined),
	delete: vi.fn().mockResolvedValue(undefined),
	status: vi.fn().mockResolvedValue({ unread: 5, total: 100 }),
	listFolders: vi.fn().mockResolvedValue([mockFolder]),
};

// Mock TokenStoragePort
export const mockTokenStorage: TokenStoragePort = {
	saveTokens: vi.fn().mockResolvedValue(undefined),
	getTokens: vi.fn().mockResolvedValue({
		access_token: "test-token",
		refresh_token: "test-refresh",
	}),
	deleteTokens: vi.fn().mockResolvedValue(undefined),
	listAccounts: vi.fn().mockResolvedValue(["user@gmail.com:gmail"]),
	refreshAccessToken: vi.fn().mockResolvedValue("new-access-token"),
};

// Mock ConfigPort
export const mockConfig: ConfigPort = {
	loadConfig: vi.fn().mockResolvedValue({
		gmail: { clientId: "test-client-id", clientSecret: "test-client-secret" },
		outlook: { clientId: "test-outlook-id" },
	}),
	getConfigPath: vi.fn().mockReturnValue("/tmp/test-config.json"),
};
