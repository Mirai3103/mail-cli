import type { Folder, ListResult } from "../types/domain.js";
import type { EmailProviderPort } from "../types/ports.js";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants.js";

export class MailboxService {
	constructor(private emailProvider: EmailProviderPort) {}

	async list(
		folder: string = "INBOX",
		limit: number = DEFAULT_PAGE_LIMIT,
	): Promise<ListResult> {
		return await this.emailProvider.list(folder, limit);
	}

	async status(): Promise<{ unread: number; total: number }> {
		return await this.emailProvider.status();
	}

	async listFolders(): Promise<Folder[]> {
		return await this.emailProvider.listFolders();
	}
}
