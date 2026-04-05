import {
	ConfigImpl,
	GmailProvider,
	OutlookProvider,
	TokenStorageImpl,
} from "./infrastructure/index.js";
import {
	AccountService,
	ComposeService,
	EmailService,
	MailboxService,
} from "./services/index.js";
import { LogLevel, logger } from "./services/logger.js";

// Token storage and config are singletons (stateless)
const tokenStorage = new TokenStorageImpl();
const config = new ConfigImpl();

// AccountService is stateless, instantiated once
const accountService = new AccountService(tokenStorage, config);

// Provider factory based on account
function createProvider(account: string) {
	if (account.endsWith(":gmail")) {
		return new GmailProvider(account);
	} else if (account.endsWith(":outlook")) {
		return new OutlookProvider(account);
	}
	return new GmailProvider(account);
}

// Service factory - creates services with the right provider per command invocation
function createMailboxService(provider: GmailProvider | OutlookProvider) {
	return new MailboxService(provider);
}

function createEmailService(provider: GmailProvider | OutlookProvider) {
	return new EmailService(provider);
}

function createComposeService(provider: GmailProvider | OutlookProvider) {
	return new ComposeService(provider);
}

export {
	accountService,
	config,
	createComposeService,
	createEmailService,
	createMailboxService,
	createProvider,
	LogLevel,
	logger,
	tokenStorage,
};
