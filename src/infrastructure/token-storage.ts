import { saveTokens, getTokens, deleteTokens, listAccounts } from "../auth/oauth.js";
import { refreshAccessToken } from "../auth/oauth.js";
import type { TokenStoragePort } from "../types/ports.js";

/**
 * TokenStorageImpl implements TokenStoragePort using file-based token storage.
 * Tokens are persisted to ~/.emailcli/tokens/{email}.json
 */
export class TokenStorageImpl implements TokenStoragePort {
	async saveTokens(email: string, tokens: object): Promise<void> {
		await saveTokens(email, tokens);
	}

	async getTokens(email: string): Promise<object | null> {
		return await getTokens(email);
	}

	async deleteTokens(email: string): Promise<void> {
		await deleteTokens(email);
	}

	async listAccounts(): Promise<string[]> {
		return await listAccounts();
	}

	async refreshAccessToken(email: string): Promise<string> {
		return await refreshAccessToken(email);
	}
}
