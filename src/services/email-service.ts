import type { EmailProviderPort } from "../types/ports.js";
import type { Email } from "../types/domain.js";

export class EmailService {
	constructor(private emailProvider: EmailProviderPort) {}

	async read(id: string): Promise<Email> {
		return await this.emailProvider.read(id);
	}

	async readThread(id: string): Promise<Email[]> {
		return await this.emailProvider.readThread(id);
	}

	async search(query: string, limit: number = 20): Promise<Email[]> {
		return await this.emailProvider.search(query, limit);
	}
}
