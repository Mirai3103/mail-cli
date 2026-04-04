#!/usr/bin/env bun
import keytar from "keytar";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const SERVICE = "mail-cli";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "http://localhost:8080"
);

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
  const tokens = await oauth2Client.getToken(code);

  // Extract email from id_token payload if available
  let email = "";
  if (tokens.tokens.id_token) {
    const payload = JSON.parse(
      Buffer.from(tokens.tokens.id_token.split(".")[1], "base64").toString()
    );
    email = payload.email || "";
  }

  return { tokens: tokens.tokens, email };
}

/**
 * Save tokens to keytar for a given email account
 */
export async function saveTokens(
  email: string,
  tokens: object
): Promise<void> {
  await keytar.setPassword(SERVICE, email, JSON.stringify(tokens));
}

/**
 * Get tokens from keytar for a given email account
 */
export async function getTokens(
  email: string
): Promise<object | null> {
  const tokenJson = await keytar.getPassword(SERVICE, email);
  if (!tokenJson) return null;
  return JSON.parse(tokenJson);
}

/**
 * Delete tokens from keytar for a given email account
 */
export async function deleteTokens(email: string): Promise<void> {
  await keytar.deletePassword(SERVICE, email);
}

/**
 * List all accounts stored in keytar
 */
export async function listAccounts(): Promise<string[]> {
  const credentials = await keytar.findCredentials(SERVICE);
  return credentials.map((cred) => cred.account);
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
