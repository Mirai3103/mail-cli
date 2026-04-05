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
	type?: string;
}

export interface SendEmailOptions {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	attachments?: string[];
}

export interface ListResult {
	emails: Email[];
	nextPageToken?: string;
}

export interface MailboxStatus {
	unread: number;
	total: number;
}
