import type {
	AttachmentDownloadResult,
	Email,
	Folder,
	SendEmailOptions,
} from "./domain.js";

// Re-export for convenience
export type {
	Email,
	Folder,
	ListResult,
	MailboxStatus,
	SendEmailOptions,
} from "./domain.js";

export interface EmailProviderPort {
	account: string;
	authenticate(): Promise<void>;
	getAuthToken(): Promise<string>;
	list(
		folder?: string,
		limit?: number,
	): Promise<{ emails: Email[]; nextPageToken?: string }>;
	read(id: string): Promise<Email>;
	readThread(id: string): Promise<Email[]>;
	search(query: string, limit?: number): Promise<Email[]>;
	send(msg: SendEmailOptions): Promise<string>;
	reply(
		id: string,
		msg: {
			to: string[];
			cc?: string[];
			bcc?: string[];
			subject: string;
			body: string;
		},
	): Promise<string>;
	mark(id: string, read: boolean): Promise<void>;
	move(id: string, folder: string): Promise<void>;
	delete(id: string): Promise<void>;
	status(): Promise<{ unread: number; total: number }>;
	listFolders(): Promise<Folder[]>;
	downloadAttachment(
		messageId: string,
		attachmentId: string,
		filename: string,
	): Promise<AttachmentDownloadResult>;
}

export interface TokenStoragePort {
	saveTokens(email: string, tokens: object): Promise<void>;
	getTokens(email: string): Promise<object | null>;
	deleteTokens(email: string): Promise<void>;
	listAccounts(): Promise<string[]>;
	refreshAccessToken(email: string): Promise<string>;
}

export interface ConfigPort {
	loadConfig(): Promise<Config>;
	getConfigPath(): string;
}

export interface Config {
	gmail: { clientId?: string; clientSecret?: string };
	outlook: { clientId?: string; clientSecret?: string };
}
