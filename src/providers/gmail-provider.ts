import { EmailProvider, type Email, type Folder, type SendEmailOptions } from "./email-provider.js";

export class GmailProvider extends EmailProvider {
  readonly provider = "gmail";
  account: string;

  constructor(account: string) {
    super();
    this.account = account;
  }

  async authenticate(): Promise<void> {
    throw new Error("Not implemented - Phase 2");
  }

  async getAuthToken(): Promise<string> {
    throw new Error("Not implemented - Phase 2");
  }

  async list(): Promise<Email[]> {
    throw new Error("Not implemented - Phase 2");
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

  async listFolders(): Promise<Folder[]> {
    throw new Error("Not implemented - Phase 2");
  }
}
