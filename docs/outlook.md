# Outlook OAuth Setup Guide

This guide walks you through setting up Microsoft Outlook OAuth2 credentials for mail-cli using Azure Active Directory (Entra ID).

## Prerequisites

- A Microsoft account (Outlook.com, Hotmail, or Azure AD account)
- Access to [Azure Portal](https://portal.azure.com/)

## Step 1: Create an App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for **Microsoft Entra ID** (formerly Azure Active Directory)
3. In the left sidebar, click **App registrations** → **New registration**
4. Fill in:
   - Name: `mail-cli`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (recommended for cross-account support)
   - Redirect URI: Leave blank for now (we'll add it later)
5. Click **Register**
6. Copy the **Application (client) ID** - you'll need this later

## Step 2: Configure Authentication

1. In your app registration, go to **Authentication**
2. Click **Add a platform** → **Web**
3. Under **Redirect URIs**, add:
   - `http://localhost:8080`
4. Under **Advanced settings**:
   - Check **Allow public client flows** → **Yes**
   - This enables device code flow for CLI apps
5. Click **Configure**

## Step 3: Add API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `Mail.Read` - Read your email
   - `Mail.Send` - Send email
   - `Mail.ReadBasic` - Read basic email info
   - `User.Read` - Get your profile
   - `offline_access` - Maintain access (refresh tokens)
4. Click **Add permissions**
5. If you see "Grant admin consent" (may be required for org accounts), click **Grant admin consent**

## Step 4: Create Client Secret (Optional)

Device code flow doesn't require a client secret, but it's needed if you later switch to other auth flows.

1. Go to **Certificates & secrets** → **New client secret**
2. Add a description (e.g., "mail-cli")
3. Select expiration period
4. Click **Add**
5. Copy the secret value immediately (it won't be shown again)

Note: For device code flow, the client secret isn't actually used. You only need the Client ID.

## Step 5: Configure mail-cli

### Option A: Environment Variables (Recommended)

```bash
export OUTLOOK_CLIENT_ID="your-client-id"
export OUTLOOK_CLIENT_SECRET="your-client-secret"  # Optional for device code flow
```

### Option B: Config File

Create `~/.emailcli/config.json`:

```json
{
  "outlook": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }
}
```

## Step 6: Add Your Outlook Account

```bash
bun ./src/cli.ts account add --provider outlook
```

You should see:
```
To sign in, use a web browser to open the page https://login.microsoftonline.com/device
and enter the code SH2QUJJTA to authenticate.
```

1. Open the URL in your browser
2. Enter the device code shown in your terminal
3. Sign in with your Microsoft account
4. Grant permissions to mail-cli
5. Return to terminal - authentication completes automatically

On success, you'll see:
```json
{"account":"your-email@outlook.com:outlook","provider":"outlook"}
```

## Step 7: Verify It Works

```bash
bun ./src/cli.ts list --folder INBOX --limit 5
```

## How Token Refresh Works

mail-cli uses MSAL (Microsoft Authentication Library) with a persistent token cache stored at `~/.emailcli/outlook-msal-cache.json`. This allows automatic token refresh without re-authenticating.

## Troubleshooting

### Error: post_request_failed: invalid_grant

This usually indicates:
1. **App not properly configured as public client** - Go to Authentication → Enable "Allow public client flows"
2. **Missing permissions** - Ensure all API permissions are granted
3. **Account type mismatch** - If using org account, ensure "Accounts in this organizational directory" is selected

### Error: Device code flow fails immediately

1. Go to Azure Portal → your app → **Authentication**
2. Verify **Allow public client flows** is set to **Yes**
3. Check that `http://localhost:8080` is listed under redirect URIs

### Token Issues

If you get authentication errors, try:

1. Delete your account: `bun ./src/cli.ts account remove your-email@outlook.com:outlook`
2. Clear MSAL cache: `rm ~/.emailcli/outlook-msal-cache.json`
3. Clear keytar credentials: Use Keychain Access (macOS), `secret-tool` (Linux), or Credential Manager (Windows) to remove `mail-cli` entries
4. Re-add: `bun ./src/cli.ts account add --provider outlook`

### Permission Denied Errors

If Graph API calls fail with permission errors:
1. Go to Azure Portal → your app → **API permissions**
2. Ensure all permissions show "Granted" status
3. For org accounts, you may need admin consent

## Microsoft Graph API Permissions Used

| Permission | Purpose |
|------------|---------|
| `Mail.Read` | Read email messages |
| `Mail.Send` | Send email |
| `Mail.ReadBasic` | Read basic email metadata |
| `User.Read` | Get user profile |
| `offline_access` | Refresh access tokens |

## Security Notes

- Tokens are stored securely in your OS keychain and MSAL cache file
- The `offline_access` scope allows token refresh without re-authentication
- Never share your Client Secret
- The MSAL cache (`~/.emailcli/outlook-msal-cache.json`) contains sensitive tokens - protect it accordingly

## Supported Account Types

When creating the app registration, choose based on your needs:

| Option | Works With |
|--------|------------|
| Personal Microsoft accounts only | Outlook.com, Hotmail |
| Accounts in any organizational directory | Microsoft 365/Entra org accounts |
| Accounts in any org directory AND personal Microsoft accounts | Both personal and work accounts |

Select **"Accounts in any organizational directory and personal Microsoft accounts"** for maximum compatibility.
