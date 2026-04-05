import { listAccounts } from "../../infrastructure/index.js";
import { GmailProvider, OutlookProvider } from "../../infrastructure/index.js";
import { CLIError } from "../../utils/errors.js";

export function getProviderFromAccount(account: string): string {
  if (account.endsWith(":gmail")) return "gmail";
  if (account.endsWith(":outlook")) return "outlook";
  return "gmail";
}

export async function resolveProvider(
  accountFlag?: string,
): Promise<GmailProvider | OutlookProvider> {
  const accounts = await listAccounts();

  let account: string;
  if (!accountFlag) {
    if (accounts.length === 0) {
      throw new CLIError(
        "NO_ACCOUNTS",
        "No accounts configured. Run 'mail-cli account add --provider gmail' first.",
      );
    }
    if (accounts.length === 1) {
      account = accounts[0]!;
    } else {
      throw new CLIError(
        "MULTIPLE_ACCOUNTS",
        `Multiple accounts found. Use --account to specify one of: ${accounts.join(", ")}`,
      );
    }
  } else {
    if (!accounts.includes(accountFlag)) {
      throw new CLIError(
        "ACCOUNT_NOT_FOUND",
        `Account ${accountFlag} not found. Available: ${accounts.join(", ")}`,
      );
    }
    account = accountFlag;
  }

  if (account.endsWith(":gmail")) {
    return new GmailProvider(account);
  } else if (account.endsWith(":outlook")) {
    return new OutlookProvider(account);
  } else {
    return new GmailProvider(account);
  }
}
