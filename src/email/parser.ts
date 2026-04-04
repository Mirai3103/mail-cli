import { simpleParser, type ParsedMail, type AddressObject, type EmailAddress } from "mailparser";
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
		parsed.text || parsed.html || "";

	// D-03: Extract attachments array
	const attachments: Attachment[] =
		parsed.attachments?.map((att: { filename?: string; contentType?: string; size?: number }, idx: number) => ({
			id: String(idx),
			filename: att.filename || "attachment",
			mimeType: att.contentType || "application/octet-stream",
			size: att.size || 0,
		})) || [];

	// Extract address headers using mailparser's Address objects
	// from and to can be AddressObject | AddressObject[] | undefined
	function getAddress(addressObj: AddressObject | AddressObject[] | undefined): string {
		if (!addressObj) return "";
		if (Array.isArray(addressObj)) return addressObj[0]?.value[0]?.address || "";
		return addressObj.value[0]?.address || "";
	}
	function getAddresses(addressObj: AddressObject | AddressObject[] | undefined): string[] {
		if (!addressObj) return [];
		if (Array.isArray(addressObj)) {
			return addressObj.flatMap((ao: AddressObject) => ao.value.map((a: EmailAddress) => a.address || ""));
		}
		return addressObj.value.map((a: EmailAddress) => a.address || "");
	}
	const fromAddress = getAddress(parsed.from);
	const toAddresses = getAddresses(parsed.to);

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
