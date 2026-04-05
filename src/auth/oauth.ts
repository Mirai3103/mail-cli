#!/usr/bin/env bun
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { loadConfig } from "../utils";
import { mkdir, readFile, writeFile, access, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import * as os from "node:os";

const TOKENS_DIR = join(os.homedir(), ".emailcli", "tokens");

const SCOPES = [
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/userinfo.email",
];

let oauth2Client :OAuth2Client;
export async function initOAuthClient() {
	const config = await loadConfig();
	oauth2Client = new google.auth.OAuth2(
		config.gmail.clientId,
		config.gmail.clientSecret,
		"http://localhost:8080",
	);
}
/**
 * Generate the OAuth2 authorization URL
 */
export function generateAuthUrl(): string {
	return oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
		prompt: "consent",
	});
}

/**
 * Get access token through OAuth2 flow
 * Starts a local server to receive the callback, exchanges code for tokens
 */
export async function getAccessToken(): Promise<{
	tokens: OAuth2Client["credentials"];
	email: string;
}> {
	const authUrl = generateAuthUrl();

	console.log("Open the following URL in your browser:");
	console.log(authUrl);
	console.log("\nAfter authorizing, paste the verification code here:");

	// Read verification code from stdin
	const readline = await import("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const code = await new Promise<string>((resolve) => {
		rl.question("Verification code: ", (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});

	// Exchange code for tokens
	const { tokens } = await oauth2Client.getToken(code);

	// Fetch user email from Google API
	const userInfo = await fetch(
		"https://www.googleapis.com/oauth2/v2/userinfo",
		{
			headers: {
				Authorization: `Bearer ${tokens.access_token}`,
			},
		},
	);
	const userData = (await userInfo.json()) as { email?: string };

	if (!userInfo.ok) {
		throw new Error(`Google API error: ${JSON.stringify(userData)}`);
	}

	const email = userData.email;

	if (!email) {
		throw new Error("Failed to get user email from Google");
	}

	return { tokens, email };
}

/**
 * Ensure the tokens directory exists
 */
async function ensureTokensDir(): Promise<void> {
	try {
		await access(TOKENS_DIR);
	} catch {
		await mkdir(TOKENS_DIR, { recursive: true });
	}
}

/**
 * Get the token file path for a given email account
 */
function getTokenFilePath(email: string): string {
	return join(TOKENS_DIR, `${email}.json`);
}

/**
 * Save tokens to a JSON file for a given email account
 */
export async function saveTokens(email: string, tokens: object): Promise<void> {
	await ensureTokensDir();
	const filePath = getTokenFilePath(email);
	await writeFile(filePath, JSON.stringify(tokens), "utf-8");
}

/**
 * Get tokens from a JSON file for a given email account
 */
export async function getTokens(email: string): Promise<object | null> {
	const filePath = getTokenFilePath(email);
	try {
		const content = await readFile(filePath, "utf-8");
		return JSON.parse(content);
	} catch {
		return null;
	}
}

/**
 * Delete tokens from a JSON file for a given email account
 */
export async function deleteTokens(email: string): Promise<void> {
	const filePath = getTokenFilePath(email);
	try {
		await unlink(filePath);
	} catch {
		// File doesn't exist, nothing to delete
	}
}

/**
 * List all accounts stored in the tokens directory
 */
export async function listAccounts(): Promise<string[]> {
	await ensureTokensDir();
	try {
		const files = await readdir(TOKENS_DIR);
		return files
			.filter((file) => file.endsWith(".json"))
			.map((file) => file.replace(/\.json$/, ""));
	} catch {
		return [];
	}
}

/**
 * Refresh access token if expired
 */
export async function refreshAccessToken(email: string): Promise<string> {
	const tokens = await getTokens(email);
	if (!tokens) {
		throw new Error(`No tokens found for account: ${email}`);
	}

	oauth2Client.setCredentials(tokens);

	return new Promise((resolve, reject) => {
		oauth2Client.refreshAccessToken((err, newTokens) => {
			if (err) {
				reject(err);
				return;
			}
			if (newTokens) {
				// Save the refreshed tokens
				saveTokens(email, newTokens).then(() => {
					resolve(newTokens.access_token || "");
				});
			} else {
				reject(new Error("Failed to refresh access token"));
			}
		});
	});
}
