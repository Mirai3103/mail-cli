import { google } from "googleapis";
import { EmailProvider, type Email, type Folder, type SendEmailOptions } from "./email-provider.js";
import { refreshAccessToken } from "../auth/index.js";
import { CLIError } from "../utils/errors.js";

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
    throw new Error("Not implemented - Phase 2");
  }

  async search(query: string): Promise<Email[]> {
    throw new Error("Not implemented - Phase 2");
  }

  async send(msg: SendEmailOptions): Promise<string> {
    throw new Error("Not implemented - Phase 2");
  }

  async reply(id: string, msg: SendEmailOptions): Promise<string> {
    throw new Error("Not implemented - Phase 2");
  }

  async mark(id: string, read: boolean): Promise<void> {
    throw new Error("Not implemented - Phase 2");
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
