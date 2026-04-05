import type { EmailProviderPort } from "../types/ports.js";
import type { SendEmailOptions } from "../types/domain.js";

export interface ReplyOptions {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject?: string;
	body?: string;
}

export class ComposeService {
	constructor(private emailProvider: EmailProviderPort) {}

	async send(options: SendEmailOptions): Promise<{ id: string }> {
		const id = await this.emailProvider.send(options);
		return { id };
	}

	async reply(id: string, options: ReplyOptions): Promise<{ id: string }> {
		const replyId = await this.emailProvider.reply(id, {
			to: options.to,
			cc: options.cc,
			bcc: options.bcc,
			subject: options.subject ?? "",
			body: options.body ?? "",
		});
		return { id: replyId };
	}
}
