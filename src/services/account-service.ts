import { getAccessToken, getOutlookAuthToken } from "../auth/index.js";
import type { ConfigPort, TokenStoragePort } from "../types/ports.js";
import { CLIError } from "../utils/errors.js";

function getProviderFromAccount(account: string): string {
	if (account.endsWith(":gmail")) return "gmail";
	if (account.endsWith(":outlook")) return "outlook";
	return "gmail";
}

export class AccountService {
	constructor(
		private tokenStorage: TokenStoragePort,
		private config: ConfigPort,
	) {}

	async addAccount(
		provider: string,
	): Promise<{ account: string; provider: string }> {
		const config = await this.config.loadConfig();

		if (provider === "gmail") {
			if (!config.gmail.clientId || !config.gmail.clientSecret) {
				throw new CLIError(
					"MISSING_ENV",
					"Gmail credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET env vars, or configure ~/.emailcli/config.json",
				);
			}
			const { tokens, email } = await getAccessToken();
			await this.tokenStorage.saveTokens(email, tokens);
			return { account: `${email}:gmail`, provider: "gmail" };
		} else if (provider === "outlook") {
			if (!config.outlook.clientId) {
				throw new CLIError(
					"MISSING_ENV",
					"Outlook Client ID not configured. Set OUTLOOK_CLIENT_ID env var, or configure ~/.emailcli/config.json",
				);
			}
			await getOutlookAuthToken("");
			const accounts = await this.tokenStorage.listAccounts();
			const outlookAccount = accounts.find((a) => a.endsWith(":outlook"));
			if (!outlookAccount) {
				throw new CLIError(
					"OUTLOOK_AUTH_ERROR",
					"Failed to get Outlook account after authentication",
				);
			}
			return { account: outlookAccount, provider: "outlook" };
		} else {
			throw new CLIError(
				"UNSUPPORTED_PROVIDER",
				`Provider '${provider}' is not supported. Use 'gmail' or 'outlook'.`,
			);
		}
	}

	async listAccounts(): Promise<Array<{ account: string; provider: string }>> {
		const accounts = await this.tokenStorage.listAccounts();
		return accounts.map((account) => ({
			account,
			provider: getProviderFromAccount(account),
		}));
	}

	async removeAccount(accountId: string): Promise<{ removed: string }> {
		const accounts = await this.tokenStorage.listAccounts();
		if (!accounts.includes(accountId)) {
			throw new CLIError("ACCOUNT_NOT_FOUND", `Account ${accountId} not found`);
		}
		await this.tokenStorage.deleteTokens(accountId);
		return { removed: accountId };
	}

	async removeAllAccounts(): Promise<{ removed: string[] }> {
		const accounts = await this.tokenStorage.listAccounts();
		await Promise.all(
			accounts.map((account) => this.tokenStorage.deleteTokens(account)),
		);
		return { removed: accounts };
	}
}
