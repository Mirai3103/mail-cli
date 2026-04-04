import { simpleParser, type ParsedMail } from "mailparser";
import type { Email, Attachment } from "../providers/email-provider.js";

/**
 * Decode Gmail API base64url-encoded raw email to UTF-8 string.
 * Gmail API raw field uses base64url (URL-safe, no padding).
 */
export function decodeBase64UrlRaw(base64url: string): string {
	// Convert base64url to standard base64
	const standardBase64 = base64url
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "=");
	// Decode using atob (available in Bun)
	return atob(standardBase64);
}

/**
 * Parse a Gmail API raw email (base64url-encoded RFC 2822) into an Email object.
 * Used by GmailProvider.read() and GmailProvider.readThread().
 */
export async function parseGmailRaw(
	rawBase64Url: string,
	options: { id: string; threadId: string; labelIds?: string[] } = {
		id: "",
		threadId: "",
	},
): Promise<Email> {
	const raw = decodeBase64UrlRaw(rawBase64Url);
	const parsed: ParsedMail = await simpleParser(raw);

	// D-03: Extract body.text, falling back to html if no plain text
	const bodyText =
		parsed.body?.text || parsed.text || parsed.body?.html || parsed.html || "";

	// D-03: Extract attachments array
	const attachments: Attachment[] =
		parsed.attachments?.map((att, idx) => ({
			id: String(idx),
			filename: att.filename || "attachment",
			mimeType: att.contentType || "application/octet-stream",
			size: att.size || 0,
		})) || [];

	// Extract address headers using mailparser's Address objects
	const fromAddress = parsed.from?.value?.[0]?.address || "";
	const toAddresses = parsed.to?.value?.map((a) => a.address || "") || [];

	return {
		id: options.id,
		threadId: options.threadId,
		from: fromAddress,
		to: toAddresses,
		subject: parsed.subject || "",
		date: parsed.date?.toISOString() || "",
		body: bodyText,
		flags: options.labelIds || [],
		attachments,
	};
}
