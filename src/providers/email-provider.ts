/**
 * EmailProvider abstract class
 * Defines the interface all email providers must implement.
 */

export interface Email {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  body?: string;
  flags?: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Folder {
  id: string;
  name: string;
  type?: "system" | "user";
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

export abstract class EmailProvider {
  abstract account: string;

  // OAuth
  abstract authenticate(): Promise<void>;
  abstract getAuthToken(): Promise<string>;

  // Mailbox operations
  abstract list(): Promise<Email[]>;
  abstract read(id: string): Promise<Email>;
  abstract search(query: string): Promise<Email[]>;
  abstract send(msg: SendEmailOptions): Promise<string>;
  abstract reply(id: string, msg: SendEmailOptions): Promise<string>;
  abstract mark(id: string, read: boolean): Promise<void>;
  abstract move(id: string, folder: string): Promise<void>;
  abstract delete(id: string): Promise<void>;

  // Mailbox status
  abstract status(): Promise<{ unread: number; total: number }>;

  // Folders/labels
  abstract listFolders(): Promise<Folder[]>;
}
