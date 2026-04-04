import { PublicClientApplication, type ICachePlugin } from "@azure/msal-node";
import { saveTokens, getTokens } from "./oauth.js";
import { mkdir } from "node:fs/promises";
import { join } from "path";

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const CACHE_DIR = join(process.env.HOME || "", ".emailcli");
const CACHE_FILE = join(CACHE_DIR, "outlook-msal-cache.json");

// Ensure cache directory exists
async function ensureCacheDir(): Promise<void> {
	try {
		await mkdir(CACHE_DIR, { recursive: true });
	} catch {}
}

/**
 * Read the persisted MSAL cache from disk using Bun.file().
 */
async function readCache(): Promise<string> {
	try {
		await ensureCacheDir();
		const file = Bun.file(CACHE_FILE);
		if (await file.exists()) {
			return await file.text();
		}
		return "{}";
	} catch {
		return "{}";
	}
}

/**
 * Write the MSAL cache to disk using Bun.write().
 */
async function writeCache(cache: string): Promise<void> {
	await ensureCacheDir();
	await Bun.write(CACHE_FILE, cache);
}

/**
 * Create a cache plugin for MSAL to persist tokens to disk.
 * This enables silent token refresh across CLI invocations.
 */
function createCachePlugin(): ICachePlugin {
	return {
		beforeCacheAccess: async (cacheContext) => {
			cacheContext.tokenCache.deserialize(await readCache());
		},
		afterCacheAccess: async (cacheContext) => {
			if (cacheContext.hasChanged) {
				await writeCache(cacheContext.tokenCache.serialize());
			}
		},
	};
}

// Module-level PCA singleton with persistent cache
let pca: PublicClientApplication | null = null;

function getPCA(): PublicClientApplication {
	if (!pca) {
		pca = new PublicClientApplication({
			auth: {
				clientId: OUTLOOK_CLIENT_ID || "",
			},
			cache: {
				cachePlugin: createCachePlugin(),
			},
		});
	}
	return pca;
}

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
 * Tokens are cached to disk via MSAL's cache plugin for silent refresh.
 */
export async function getOutlookAuthToken(email: string): Promise<void> {
	if (!OUTLOOK_CLIENT_ID) {
		throw new Error("OUTLOOK_CLIENT_ID environment variable is not set");
	}

	const pcaInstance = getPCA();

	const authResult = await pcaInstance.acquireTokenByDeviceCode({
		deviceCodeCallback: (response) => {
			console.log(response.message);
		},
		scopes: [...OUTLOOK_SCOPES],
	});

	if (authResult && authResult.account) {
		// MSAL caches tokens internally via the cache plugin
		// Also store account identifiers to keytar for account lookup
		const accountEmail = authResult.account.username || email;
		const keytarAccount = `${accountEmail}:outlook`;
		await saveTokens(keytarAccount, {
			accessToken: authResult.accessToken,
			refreshToken: authResult.account.homeAccountId,
			expiresAt: authResult.expiresOn?.getTime(),
			tenantId: authResult.tenantId,
			homeAccountId: authResult.account.homeAccountId,
			localAccountId: authResult.account.localAccountId,
		});
	}
}

/**
 * Refresh an Outlook access token for a given account.
 * Uses MSAL's persistent cache for silent token refresh.
 */
export async function refreshOutlookToken(email: string): Promise<string> {
	// Strip :outlook suffix if present to get the base email
	const baseEmail = email.replace(/:outlook$/, "");
	const keytarAccount = `${baseEmail}:outlook`;
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

	const pcaInstance = getPCA();

	// MSAL's cache is persisted to disk - if we successfully authenticated before,
	// the refresh token should be in the cache and silent refresh will work
	if (tokenObj.homeAccountId && tokenObj.localAccountId) {
		try {
			const account = {
				homeAccountId: tokenObj.homeAccountId,
				localAccountId: tokenObj.localAccountId,
				environment: "login.windows.net",
				tenantId: tokenObj.tenantId || "common",
				username: email,
			};

			const refreshResult = await pcaInstance.acquireTokenSilent({
				scopes: [...OUTLOOK_SCOPES],
				account,
			});

			if (refreshResult && refreshResult.accessToken) {
				// Update keytar with fresh tokens (MSAL cache is updated automatically)
				await saveTokens(keytarAccount, {
					accessToken: refreshResult.accessToken,
					refreshToken: refreshResult.account?.homeAccountId || tokenObj.refreshToken,
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
	const authResult = await pcaInstance.acquireTokenByDeviceCode({
		deviceCodeCallback: (response) => {
			console.log(response.message);
		},
		scopes: [...OUTLOOK_SCOPES],
	});

	if (authResult && authResult.accessToken) {
		const accountEmail = authResult.account?.username || email;
		await saveTokens(`${accountEmail}:outlook`, {
			accessToken: authResult.accessToken,
			refreshToken: authResult.account?.homeAccountId || tokenObj.refreshToken,
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
