import "isomorphic-fetch";
import { PublicClientApplication } from "@azure/msal-node";
import { saveTokens, getTokens } from "./oauth.js";

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;

export const OUTLOOK_SCOPES = [
	"Mail.Read",
	"Mail.Send",
	"Mail.ReadBasic",
	"User.Read",
	"offline_access",
] as const;

/**
 * Get Outlook access token through MSAL device code flow.
 * Opens browser for user authorization, exchanges device code for tokens.
 * Saves tokens to keytar with account name format "email:outlook".
 */
export async function getOutlookAuthToken(email: string): Promise<void> {
	if (!OUTLOOK_CLIENT_ID) {
		throw new Error("OUTLOOK_CLIENT_ID environment variable is not set");
	}

	const pca = new PublicClientApplication({
		auth: {
			clientId: OUTLOOK_CLIENT_ID,
		},
	});

	const authResult = await pca.acquireTokenByDeviceCode({
		deviceCodeCallback: (response) => {
			console.log(response.message);
		},
		scopes: [...OUTLOOK_SCOPES],
	});

	if (authResult && authResult.account) {
		const accountEmail = authResult.account.username || email;
		// Store with provider suffix per D-07: email:outlook format
		const keytarAccount = `${accountEmail}:outlook`;
		await saveTokens(keytarAccount, {
			accessToken: authResult.accessToken,
			refreshToken: authResult.account.idTokenClaims?.oid || "",
			expiresAt: authResult.expiresOn?.getTime(),
			tenantId: authResult.tenantId,
			homeAccountId: authResult.account.homeAccountId,
			localAccountId: authResult.account.localAccountId,
		});
	}
}

/**
 * Refresh an Outlook access token for a given account.
 * Since we store tokens externally (keytar), MSAL's silent token cache is not used.
 * This function attempts to refresh, but falls back to device code flow if needed.
 */
export async function refreshOutlookToken(email: string): Promise<string> {
	const keytarAccount = `${email}:outlook`;
	const tokens = await getTokens(keytarAccount);

	if (!tokens) {
		throw new Error(`No tokens found for account: ${keytarAccount}`);
	}

	const tokenObj = tokens as {
		accessToken?: string;
		refreshToken?: string;
		expiresAt?: number;
		tenantId?: string;
		homeAccountId?: string;
		localAccountId?: string;
	};

	const pca = new PublicClientApplication({
		auth: {
			clientId: OUTLOOK_CLIENT_ID || "",
		},
	});

	// MSAL requires account object for silent token acquisition
	// If we have proper account info stored, try silent flow first
	if (tokenObj.homeAccountId && tokenObj.localAccountId) {
		try {
			const account = {
				homeAccountId: tokenObj.homeAccountId,
				localAccountId: tokenObj.localAccountId,
				environment: "login.microsoftonline.com",
				tenantId: tokenObj.tenantId || "common",
				username: email,
			};

			const refreshResult = await pca.acquireTokenSilent({
				scopes: [...OUTLOOK_SCOPES],
				account,
			});

			if (refreshResult && refreshResult.accessToken) {
				// Save refreshed tokens
				await saveTokens(keytarAccount, {
					accessToken: refreshResult.accessToken,
					refreshToken: tokenObj.refreshToken,
					expiresAt: refreshResult.expiresOn?.getTime(),
					tenantId: refreshResult.tenantId,
					homeAccountId: refreshResult.account?.homeAccountId || tokenObj.homeAccountId,
					localAccountId: refreshResult.account?.localAccountId || tokenObj.localAccountId,
				});
				return refreshResult.accessToken;
			}
		} catch {
			// Silent refresh failed, fall through to device code flow
		}
	}

	// Fall back to device code flow for token refresh
	const authResult = await pca.acquireTokenByDeviceCode({
		deviceCodeCallback: (response) => {
			console.log(response.message);
		},
		scopes: [...OUTLOOK_SCOPES],
	});

	if (authResult && authResult.accessToken) {
		const accountEmail = authResult.account?.username || email;
		await saveTokens(`${accountEmail}:outlook`, {
			accessToken: authResult.accessToken,
			refreshToken: authResult.account?.idTokenClaims?.oid || tokenObj.refreshToken,
			expiresAt: authResult.expiresOn?.getTime(),
			tenantId: authResult.tenantId,
			homeAccountId: authResult.account?.homeAccountId || tokenObj.homeAccountId,
			localAccountId: authResult.account?.localAccountId || tokenObj.localAccountId,
		});
		return authResult.accessToken;
	}

	throw new Error("Failed to refresh Outlook access token");
}

/**
 * Get the user's email address from Microsoft Graph API /me endpoint.
 */
export async function getOutlookUserEmail(accessToken: string): Promise<string> {
	const response = await fetch("https://graph.microsoft.com/v1.0/me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to get user email from Outlook: ${response.status}`);
	}

	const data = (await response.json()) as { mail?: string; userPrincipalName?: string };
	return data.mail || data.userPrincipalName || "";
}
