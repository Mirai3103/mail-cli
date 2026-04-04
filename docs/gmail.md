# Gmail OAuth Setup Guide

This guide walks you through setting up Gmail OAuth2 credentials for mail-cli.

## Prerequisites

- A Google account (personal Gmail or Google Workspace)
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** at the top → **New Project**
3. Enter a project name (e.g., "mail-cli")
4. Click **Create**

## Step 2: Enable the Gmail API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on **Gmail API** → **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** → **Create**
3. Fill in the required fields:
   - App name: `mail-cli`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. On **Scopes** page, click **Add or Remove Scopes**
6. Select these scopes:
   - `../auth/gmail.modify` - Read, compose, send, delete emails
   - `../auth/userinfo.email` - View your email address
7. Click **Save and Continue**
8. On **Test users** page, add your Google account
9. Click **Save and Continue**

## Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `mail-cli`
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:8080`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 5: Configure mail-cli

### Option A: Environment Variables (Recommended)

```bash
export GMAIL_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GMAIL_CLIENT_SECRET="GOCSPX-your-secret"
```

### Option B: Config File

Create `~/.emailcli/config.json`:

```json
{
  "gmail": {
    "clientId": "your-client-id.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-your-secret"
  }
}
```

## Step 6: Add Your Gmail Account

```bash
bun ./src/cli.ts account add --provider gmail
```

You should see:
```
Open the following URL in your browser:
https://accounts.google.com/o/oauth2/auth?access_type=offline&...
```

1. Open the URL in your browser
2. Sign in with your Google account
3. Grant permissions to mail-cli
4. Copy the verification code from the URL (after `code=`)
5. Paste it into the terminal

On success, you'll see:
```json
{"account":"your-email@gmail.com:gmail","provider":"gmail"}
```

## Step 7: Verify It Works

```bash
bun ./src/cli.ts list --folder INBOX --limit 5
```

## Troubleshooting

### Error: redirect_uri_mismatch

Make sure you added `http://localhost:8080` as an authorized redirect URI in your Google Cloud Console credentials.

### Error: access_denied

The OAuth consent screen might need verification if you exceed 100 users. For personal use, add yourself as a test user on the OAuth consent screen.

### Token Issues

If you get authentication errors, try:
1. Delete your account: `bun ./src/cli.ts account remove your-email@gmail.com:gmail`
2. Clear tokens: Use Keychain Access (macOS) or `secret-tool` (Linux) to remove `mail-cli` entries
3. Re-add: `bun ./src/cli.ts account add --provider gmail`

## Gmail API Scopes Used

| Scope | Purpose |
|-------|---------|
| `gmail.modify` | Read, compose, send, delete emails |
| `userinfo.email` | Get your email address |

## Security Notes

- Tokens are stored in your system's keychain (macOS Keychain, Linux libsecret, Windows Credential Manager)
- The `offline` access type ensures you can refresh tokens without re-authenticating
- Never share your client secret
