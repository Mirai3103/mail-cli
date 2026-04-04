import { google } from "googleapis";
import { EmailProvider, type Email, type Folder, type SendEmailOptions } from "./email-provider.js";
import { refreshAccessToken } from "../auth/index.js";
import { CLIError } from "../utils/errors.js";
import { parseGmailRaw } from "../email/parser.js";
import { buildRawMessage, buildReplyMessage } from "../email/composer.js";

export class GmailProvider extends EmailProvider {
  readonly provider = "gmail";
  account: string;

  constructor(account: string) {
    super();
    this.account = account;
  }

  async authenticate(): Promise<void> {
    await this.getAuthToken();
  }

  async getAuthToken(): Promise<string> {
    try {
      return await refreshAccessToken(this.account);
    } catch (err) {
      throw new CLIError(
        "GMAIL_AUTH_ERROR",
        "Failed to get authentication token",
        err
      );
    }
  }

  async list(folder: string = "INBOX", limit: number = 20): Promise<{ emails: Email[]; nextPageToken?: string }> {
    // Validate limit per D-03 (max 100)
    const safeLimit = Math.min(Math.max(1, limit), 100);

    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Get message list
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: safeLimit,
        labelIds: [folder],
      });

      const messages = listResponse.data.messages || [];
      const nextPageToken = listResponse.data.nextPageToken;

      // Fetch metadata for each message (headers + labels)
      const emails = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "METADATA",
            metadataHeaders: ["From", "Subject", "Date"],
          });

          const headers = detail.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name === name)?.value || "";

          return {
            id: msg.id!,
            from: getHeader("From"),
            subject: getHeader("Subject"),
            date: getHeader("Date"),
            flags: detail.data.labelIds || [],
          };
        })
      );

      // Return with nextPageToken in response metadata (D-05)
      // The token is for scripting awareness only - D-04 prohibits pagination via token
      return { emails, nextPageToken };
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        "Failed to list messages",
        err
      );
    }
  }

  async read(id: string): Promise<Email> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // D-03: Fetch raw message for full body parsing with mailparser
      const response = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "RAW",
      });

      const raw = response.data.raw!; // base64url-encoded RFC 2822
      const threadId = response.data.threadId!;
      const labelIds = response.data.labelIds || [];

      // D-03: Return full Email object via mailparser
      return await parseGmailRaw(raw, { id, threadId, labelIds });
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        `Failed to read message ${id}`,
        err
      );
    }
  }

  async readThread(threadId: string): Promise<Email[]> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // D-05: threads.get doesn't support RAW format - get format:"full" for message list
      const threadResponse = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });

      const messages = threadResponse.data.messages || [];
      if (messages.length === 0) {
        return [];
      }

      // D-06: Each message needs separate messages.get with format:"RAW" for full body
      // Per RESEARCH Pitfall 3: threads.get doesn't support RAW format
      const emails = await Promise.all(
        messages.map(async (msg) => {
          const rawResponse = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "RAW",
          });

          return await parseGmailRaw(rawResponse.data.raw!, {
            id: msg.id!,
            threadId,
            labelIds: rawResponse.data.labelIds || [],
          });
        })
      );

      return emails;
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        `Failed to read thread ${threadId}`,
        err
      );
    }
  }

  async search(query: string, limit: number = 20): Promise<Email[]> {
    // D-09: limit capped at 100
    const safeLimit = Math.min(Math.max(1, limit), 100);

    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // D-07: Pass Gmail search syntax directly to q parameter
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: safeLimit,
      });

      const messages = listResponse.data.messages || [];
      if (messages.length === 0) {
        return [];
      }

      // D-08: Fetch metadata for each message (same fields as list command)
      const emails = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "METADATA",
            metadataHeaders: ["From", "Subject", "Date"],
          });

          const headers = detail.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name === name)?.value || "";

          return {
            id: msg.id!,
            threadId: msg.threadId!,
            from: getHeader("From"),
            subject: getHeader("Subject"),
            date: getHeader("Date"),
            flags: detail.data.labelIds || [],
          };
        })
      );

      return emails;
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        `Failed to search messages with query: ${query}`,
        err
      );
    }
  }

  async send(msg: SendEmailOptions): Promise<string> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // D-12: Build MIME with nodemailer, encode to base64url
      const rawBase64Url = buildRawMessage({
        to: msg.to,
        cc: msg.cc,
        bcc: msg.bcc,
        subject: msg.subject,
        text: msg.body,
      });

      const sendResponse = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: rawBase64Url },
      });

      return sendResponse.data.id!;
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        "Failed to send message",
        err
      );
    }
  }

  async reply(id: string, msg: SendEmailOptions): Promise<string> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // D-16: Fetch original message to get threading headers and subject
      const original = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "METADATA",
        metadataHeaders: ["Message-ID", "References", "In-Reply-To", "Subject"],
      });

      const headers = original.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name === name)?.value || "";

      const messageId = getHeader("Message-ID");
      const inReplyTo = getHeader("In-Reply-To") || messageId;
      const existingRefs = getHeader("References");
      const originalSubject = getHeader("Subject");

      // D-13: Build References header (existing References + Message-ID)
      const references = existingRefs
        ? `${existingRefs} ${messageId}`
        : messageId;

      // D-14: Prepend "Re: " if not already present (handled in buildReplyMessage)
      // D-15: Body is always empty (handled in buildReplyMessage)

      const rawBase64Url = buildReplyMessage({
        to: msg.to,
        subject: originalSubject,
        inReplyTo,
        references,
      });

      const sendResponse = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: rawBase64Url },
      });

      return sendResponse.data.id!;
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        `Failed to reply to message ${id}`,
        err
      );
    }
  }

  async mark(id: string, read: boolean): Promise<void> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      await gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: {
          // read=true means remove UNREAD (mark as read)
          // read=false means add UNREAD (mark as unread)
          removeLabelIds: read ? ["UNREAD"] : [],
          addLabelIds: read ? [] : ["UNREAD"],
        },
      });
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        `Failed to mark message ${id}`,
        err
      );
    }
  }

  async move(id: string, folder: string): Promise<void> {
    throw new Error("Not implemented - Phase 2");
  }

  async delete(id: string): Promise<void> {
    throw new Error("Not implemented - Phase 2");
  }

  async status(): Promise<{ unread: number; total: number }> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const response = await gmail.users.labels.list({
        userId: "me",
      });

      const inboxLabel = response.data.labels?.find(
        (l) => l.id === "INBOX"
      );

      if (!inboxLabel) {
        throw new CLIError(
          "GMAIL_API_ERROR",
          "INBOX label not found"
        );
      }

      return {
        unread: inboxLabel.messagesUnread || 0,
        total: inboxLabel.messagesTotal || 0,
      };
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        "Failed to get mailbox status",
        err
      );
    }
  }

  async listFolders(): Promise<Folder[]> {
    try {
      const accessToken = await this.getAuthToken();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const response = await gmail.users.labels.list({
        userId: "me",
      });

      const folders: Folder[] = (response.data.labels || []).map((label) => ({
        id: label.id!,
        name: label.name!,
        type: label.type as "system" | "user",
      }));

      return folders;
    } catch (err) {
      if (err instanceof CLIError) throw err;
      throw new CLIError(
        "GMAIL_API_ERROR",
        "Failed to list folders",
        err
      );
    }
  }
}
