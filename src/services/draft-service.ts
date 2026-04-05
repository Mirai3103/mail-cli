import { randomUUID } from "node:crypto";
import type { Draft, SendEmailOptions } from "../types/domain.js";
import { DraftStorage } from "../infrastructure/draft-storage.js";

export class DraftService {
	private storage: DraftStorage;

	constructor() {
		this.storage = new DraftStorage();
	}

	/**
	 * List all drafts for the given account.
	 */
	async list(account: string): Promise<Draft[]> {
		return await this.storage.listByAccount(account);
	}

	/**
	 * Get a single draft by ID, verifying it belongs to the account.
	 */
	async get(id: string, account: string): Promise<Draft | null> {
		const draft = await this.storage.getById(id);
		if (!draft || draft.account !== account) {
			return null;
		}
		return draft;
	}

	/**
	 * Save a new draft from send options.
	 * Returns the created draft with generated ID and timestamps.
	 */
	async save(options: SendEmailOptions, account: string): Promise<Draft> {
		const now = new Date().toISOString();
		const draft: Draft = {
			id: randomUUID(),
			account,
			to: options.to,
			cc: options.cc,
			bcc: options.bcc,
			subject: options.subject,
			body: options.body,
			attachments: options.attachments || [],
			createdAt: now,
			updatedAt: now,
		};
		await this.storage.save(draft);
		return draft;
	}

	/**
	 * Update an existing draft.
	 * Returns null if draft doesn't exist or belongs to different account.
	 */
	async update(
		id: string,
		options: Partial<SendEmailOptions>,
		account: string,
	): Promise<Draft | null> {
		const existing = await this.get(id, account);
		if (!existing) {
			return null;
		}

		const updated: Draft = {
			...existing,
			...(options.to !== undefined && { to: options.to }),
			...(options.cc !== undefined && { cc: options.cc }),
			...(options.bcc !== undefined && { bcc: options.bcc }),
			...(options.subject !== undefined && { subject: options.subject }),
			...(options.body !== undefined && { body: options.body }),
			...(options.attachments !== undefined && {
				attachments: options.attachments,
			}),
			updatedAt: new Date().toISOString(),
		};

		await this.storage.save(updated);
		return updated;
	}

	/**
	 * Delete a draft.
	 * Returns true if deleted, false if not found or belonged to different account.
	 */
	async delete(id: string, account: string): Promise<boolean> {
		const existing = await this.get(id, account);
		if (!existing) {
			return false;
		}
		return await this.storage.delete(id);
	}
}
