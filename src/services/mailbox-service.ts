import type { EmailProviderPort } from "../types/ports.js";
import type { Folder, ListResult } from "../types/domain.js";

export class MailboxService {
	constructor(private emailProvider: EmailProviderPort) {}

	async list(folder: string = "INBOX", limit: number = 20): Promise<ListResult> {
		return await this.emailProvider.list(folder, limit);
	}

	async status(): Promise<{ unread: number; total: number }> {
		return await this.emailProvider.status();
	}

	async listFolders(): Promise<Folder[]> {
		return await this.emailProvider.listFolders();
	}
}
