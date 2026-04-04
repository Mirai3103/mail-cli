import { MailComposer } from "nodemailer";
import type { SendEmailOptions } from "../providers/email-provider.js";

/**
 * Encode a Buffer to base64url string for Gmail API raw field.
 */
export function base64UrlEncode(buffer: Buffer): string {
  const base64 = buffer.toString("base64");
  // Standard base64 to base64url: replace + with -, / with _, remove padding
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build a raw MIME message for Gmail API from email options.
 * Returns base64url-encoded string ready for Gmail API's raw field.
 */
export function buildRawMessage(options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: string[];
}): string {
  const mailComposer = new MailComposer({
    to: options.to.join(", "),
    cc: options.cc?.join(", "),
    bcc: options.bcc?.join(", "),
    subject: options.subject,
    text: options.text,
    html: options.html,
    headers: options.headers,
    attachments: options.attachments?.map(path => ({
      filename: path.split("/").pop() || path,
      path,
    })),
  });

  // build() returns Buffer of RFC 2822 message
  const messageBuffer = mailComposer.compile().build() as Buffer;
  return base64UrlEncode(messageBuffer);
}

/**
 * Build a reply message with proper threading headers.
 * Per D-13: Sets References/In-Reply-To headers automatically.
 * Per D-14: Prepends "Re: " if subject doesn't already start with it.
 * Per D-15: Body is always empty.
 */
export function buildReplyMessage(options: {
  to: string[];        // Reply recipients (From of original message)
  subject: string;     // Original subject (will prepend "Re: " if needed)
  inReplyTo: string;   // In-Reply-To header value (original Message-ID)
  references: string;  // References header value (original References + Message-ID)
}): string {
  // D-14: Prepend "Re: " if not already present
  const replySubject = options.subject.match(/^Re:\s*/i)
    ? options.subject
    : `Re: ${options.subject}`;

  return buildRawMessage({
    to: options.to,
    subject: replySubject,
    text: "", // D-15: empty body per SEND-04 spec
    headers: {
      "In-Reply-To": options.inReplyTo,
      "References": options.references,
    },
  });
}