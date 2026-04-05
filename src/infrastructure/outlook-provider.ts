import { Client } from "@microsoft/microsoft-graph-client";
import { refreshOutlookToken } from "../auth/outlook-oauth.js";
import type {
	Attachment,
	AttachmentDownloadResult,
	Email,
	Folder,
	SendEmailOptions,
} from "../types/domain.js";
import type { EmailProviderPort } from "../types/ports.js";
import { CLIError } from "../utils/errors.js";
import {
	DEFAULT_PAGE_LIMIT,
	MAX_PAGE_LIMIT,
	MIN_PAGE_LIMIT,
} from "../utils/constants.js";

export class OutlookProvider implements EmailProviderPort {
	readonly provider = "outlook";
	account: string;

	constructor(account: string) {
		this.account = account;
	}

	async authenticate(): Promise<void> {
		await this.getAuthToken();
	}

	async getAuthToken(): Promise<string> {
		try {
			return await refreshOutlookToken(this.account);
		} catch (err) {
			throw new CLIError(
				"OUTLOOK_AUTH_ERROR",
				"Failed to get Outlook auth token",
				err,
			);
		}
	}

	/**
	 * Create a Graph API client with the current access token.
	 */
	private async getClient(): Promise<Client> {
		const accessToken = await this.getAuthToken();
		return Client.init({
			authProvider: (done) => {
				done(null, accessToken);
			},
		});
	}

	/**
	 * Helper to strip outlook: prefix from IDs before sending to API.
	 */
	private stripPrefix(id: string): string {
		return id.replace(/^outlook:/, "");
	}

	/**
	 * Helper to add outlook: prefix to IDs returned from API.
	 */
	private addPrefix(id: string): string {
		return `outlook:${id}`;
	}

	/**
	 * Resolve a folder display name to its folder ID.
	 */
	private async getFolderIdByName(name: string): Promise<string | null> {
		const client = await this.getClient();
		const folders = await client.api("/me/mailFolders").get();
		const folder = folders.value.find(
			(f: {
				displayName: string;
				childFolderCount: number;
				wellKnownName?: string;
			}) => f.displayName === name || f.wellKnownName === name,
		);
		return folder?.id || null;
	}

	async list(
		folder: string = "Inbox",
		limit: number = DEFAULT_PAGE_LIMIT,
	): Promise<{ emails: Email[]; nextPageToken?: string }> {
		const safeLimit = Math.min(Math.max(MIN_PAGE_LIMIT, limit), MAX_PAGE_LIMIT);

		try {
			const client = await this.getClient();

			// Resolve folder name to ID
			let folderId: string;
			if (folder === "Inbox" || folder === "INBOX") {
				folderId = "inbox";
			} else {
				const resolvedId = await this.getFolderIdByName(folder);
				if (!resolvedId) {
					throw new CLIError(
						"OUTLOOK_FOLDER_NOT_FOUND",
						`Folder '${folder}' not found`,
					);
				}
				folderId = resolvedId;
			}

			const response = await client
				.api(`/me/mailFolders/${folderId}/messages`)
				.top(safeLimit)
				.select("id,conversationId,subject,from,receivedDateTime,isRead")
				.get();

			const emails: Email[] = response.value.map(
				(msg: {
					id: string;
					conversationId: string;
					subject: string;
					from: { emailAddress: { address: string; name?: string } };
					receivedDateTime: string;
					isRead: boolean;
				}) => ({
					id: this.addPrefix(msg.id),
					threadId: this.addPrefix(msg.conversationId),
					from: msg.from.emailAddress.address,
					to: [] as string[],
					subject: msg.subject || "",
					date: msg.receivedDateTime,
					flags: msg.isRead ? ["read"] : ["unread"],
				}),
			);

			return {
				emails,
				nextPageToken: response["@odata.nextLink"] || undefined,
			};
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to list messages in folder '${folder}'`,
				err,
			);
		}
	}

	async read(id: string): Promise<Email> {
		try {
			const client = await this.getClient();
			const localId = this.stripPrefix(id);

			const msg = await client
				.api(`/me/messages/${localId}`)
				.header("Prefer", "outlook.body-type=text")
				.select(
					"id,conversationId,subject,from,toRecipients,ccRecipients,sentDateTime,receivedDateTime,hasAttachments,attachments,body",
				)
				.get();

			// Parse attachments if present
			let attachments: Attachment[] | undefined;
			if (msg.hasAttachments && msg.attachments) {
				attachments = msg.attachments.map(
					(att: {
						id: string;
						name: string;
						contentType: string;
						size: number;
					}) => ({
						id: att.id,
						filename: att.name,
						mimeType: att.contentType,
						size: att.size,
					}),
				);
			}

			return {
				id: this.addPrefix(msg.id),
				threadId: this.addPrefix(msg.conversationId),
				from: msg.from.emailAddress.address,
				to: msg.toRecipients.map(
					(r: { emailAddress: { address: string } }) => r.emailAddress.address,
				),
				subject: msg.subject || "",
				date: msg.receivedDateTime,
				body: msg.body?.content || "",
				attachments,
			};
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to read message ${id}`,
				err,
			);
		}
	}

	async readThread(threadId: string): Promise<Email[]> {
		try {
			const client = await this.getClient();
			const localThreadId = this.stripPrefix(threadId);

			const response = await client
				.api(`/me/messages`)
				.filter(`conversationId eq '${localThreadId}'`)
				.orderby("receivedDateTime asc")
				.select(
					"id,conversationId,subject,from,toRecipients,sentDateTime,receivedDateTime,body,hasAttachments,attachments",
				)
				.get();

			const emails: Email[] = await Promise.all(
				response.value.map(
					async (msg: {
						id: string;
						conversationId: string;
						subject: string;
						from: { emailAddress: { address: string; name?: string } };
						toRecipients: { emailAddress: { address: string } }[];
						sentDateTime: string;
						receivedDateTime: string;
						body?: { content?: string };
						hasAttachments: boolean;
						attachments?: {
							id: string;
							name: string;
							contentType: string;
							size: number;
						}[];
					}) => {
						let attachments: Attachment[] | undefined;
						if (msg.hasAttachments && msg.attachments) {
							attachments = msg.attachments.map(
								(att: {
									id: string;
									name: string;
									contentType: string;
									size: number;
								}) => ({
									id: att.id,
									filename: att.name,
									mimeType: att.contentType,
									size: att.size,
								}),
							);
						}
						return {
							id: this.addPrefix(msg.id),
							threadId: this.addPrefix(msg.conversationId),
							from: msg.from.emailAddress.address,
							to: msg.toRecipients.map(
								(r: { emailAddress: { address: string } }) =>
									r.emailAddress.address,
							),
							subject: msg.subject || "",
							date: msg.receivedDateTime,
							body: msg.body?.content || "",
							attachments,
						};
					},
				),
			);

			return emails;
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to read thread ${threadId}`,
				err,
			);
		}
	}

	async search(query: string, limit: number = 20): Promise<Email[]> {
		const safeLimit = Math.min(Math.max(MIN_PAGE_LIMIT, limit), MAX_PAGE_LIMIT);

		try {
			const client = await this.getClient();

			// Pass Graph-compatible KQL via $filter parameter
			const response = await client
				.api("/me/messages")
				.filter(query)
				.top(safeLimit)
				.select("id,conversationId,subject,from,receivedDateTime,isRead")
				.get();

			const emails: Email[] = response.value.map(
				(msg: {
					id: string;
					conversationId: string;
					subject: string;
					from: { emailAddress: { address: string } };
					receivedDateTime: string;
					isRead: boolean;
				}) => ({
					id: this.addPrefix(msg.id),
					threadId: this.addPrefix(msg.conversationId),
					from: msg.from.emailAddress.address,
					to: [] as string[],
					subject: msg.subject || "",
					date: msg.receivedDateTime,
					flags: msg.isRead ? ["read"] : ["unread"],
				}),
			);

			return emails;
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to search messages with query: ${query}`,
				err,
			);
		}
	}

	async send(msg: SendEmailOptions): Promise<string> {
		try {
			const client = await this.getClient();

			const sendBody = {
				message: {
					subject: msg.subject,
					body: {
						contentType: "Text",
						content: msg.body,
					},
					toRecipients: msg.to.map((address) => ({
						emailAddress: { address },
					})),
					...(msg.cc && {
						ccRecipients: msg.cc.map((address) => ({
							emailAddress: { address },
						})),
					}),
					...(msg.bcc && {
						bccRecipients: msg.bcc.map((address) => ({
							emailAddress: { address },
						})),
					}),
				},
				saveToSentItems: true,
			};

			await client.api("/me/sendMail").post(sendBody);

			// Return a sent indicator (Outlook sendMail doesn't return message ID)
			return `sent:${Date.now()}`;
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError("OUTLOOK_API_ERROR", "Failed to send message", err);
		}
	}

	async reply(
		id: string,
		msg: {
			to: string[];
			cc?: string[];
			bcc?: string[];
			subject: string;
			body: string;
		},
	): Promise<string> {
		try {
			const client = await this.getClient();
			const localId = this.stripPrefix(id);

			// Fetch original message to get threading headers
			const original = await client
				.api(`/me/messages/${localId}`)
				.select("id,conversationId,subject,from,toRecipients,internetMessageId")
				.get();

			const inReplyTo = original.internetMessageId || original.id;

			// Build reply subject (prepend "Re: " if needed)
			const replySubject = original.subject?.match(/^Re:\s*/i)
				? original.subject
				: `Re: ${original.subject || ""}`;

			const sendBody = {
				message: {
					subject: replySubject,
					body: {
						contentType: "Text",
						content: msg.body,
					},
					toRecipients: msg.to.map((address) => ({
						emailAddress: { address },
					})),
					...(msg.cc && {
						ccRecipients: msg.cc.map((address) => ({
							emailAddress: { address },
						})),
					}),
					inReplyTo,
				},
				saveToSentItems: true,
			};

			await client.api("/me/sendMail").post(sendBody);

			return `sent:${Date.now()}`;
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to reply to message ${id}`,
				err,
			);
		}
	}

	async mark(id: string, read: boolean): Promise<void> {
		try {
			const client = await this.getClient();
			const localId = this.stripPrefix(id);

			await client.api(`/me/messages/${localId}`).patch({ isRead: read });
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to mark message ${id}`,
				err,
			);
		}
	}

	async move(id: string, folder: string): Promise<void> {
		try {
			const client = await this.getClient();
			const localId = this.stripPrefix(id);

			// Resolve folder name to ID
			const folderId = await this.getFolderIdByName(folder);
			if (!folderId) {
				throw new CLIError(
					"OUTLOOK_FOLDER_NOT_FOUND",
					`Folder '${folder}' not found`,
				);
			}

			await client
				.api(`/me/messages/${localId}`)
				.patch({ toFolderId: folderId });
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to move message ${id} to ${folder}`,
				err,
			);
		}
	}

	async delete(id: string): Promise<void> {
		try {
			const client = await this.getClient();
			const localId = this.stripPrefix(id);

			// Move to Deleted Items folder (soft delete)
			await client.api(`/me/messages/${localId}`).delete();
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to delete message ${id}`,
				err,
			);
		}
	}

	async status(): Promise<{ unread: number; total: number }> {
		try {
			const client = await this.getClient();

			const folder = await client
				.api("/me/mailFolders/inbox")
				.select("totalItemCount,unreadItemCount")
				.get();

			return {
				unread: folder.unreadItemCount || 0,
				total: folder.totalItemCount || 0,
			};
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				"Failed to get mailbox status",
				err,
			);
		}
	}

	async listFolders(): Promise<Folder[]> {
		try {
			const client = await this.getClient();

			const response = await client.api("/me/mailFolders").get();

			const folders: Folder[] = response.value.map(
				(folder: {
					id: string;
					displayName: string;
					wellKnownName?: string;
					folderClass?: string;
				}) => ({
					id: folder.id,
					name: folder.displayName || folder.wellKnownName || folder.id,
					type: folder.wellKnownName ? "system" : "user",
				}),
			);

			return folders;
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError("OUTLOOK_API_ERROR", "Failed to list folders", err);
		}
	}

	async downloadAttachment(
		messageId: string,
		attachmentId: string,
		filename: string,
	): Promise<AttachmentDownloadResult> {
		try {
			const client = await this.getClient();
			const localMessageId = this.stripPrefix(messageId);

			// Fetch attachment metadata and content from Graph API
			const attachment = await client
				.api(`/me/messages/${localMessageId}/attachments/${attachmentId}`)
				.get();

			// Decode base64 contentBytes to Buffer
			const decoded = Buffer.from(attachment.contentBytes, "base64");

			return {
				content: decoded,
				filename: attachment.name || filename,
				mimeType: attachment.contentType || "application/octet-stream",
				size: attachment.size
					? parseInt(String(attachment.size), 10)
					: decoded.length,
			};
		} catch (err) {
			if (err instanceof CLIError) throw err;
			throw new CLIError(
				"OUTLOOK_API_ERROR",
				`Failed to download attachment ${attachmentId} from message ${messageId}`,
				err,
			);
		}
	}
}
