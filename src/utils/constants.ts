// QUAL-01: No magic numbers — all constants named and exported

// Pagination
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const MIN_PAGE_LIMIT = 1;

// Timeouts (milliseconds)
export const DEFAULT_TIMEOUT_MS = 30000;
export const AUTH_TIMEOUT_MS = 60000;
export const HTTP_BACKOFF_MS = 1000;

// Buffer sizes
export const DEFAULT_BUFFER_SIZE = 8192;

// OAuth
export const OAUTH_LOCALHOST_PORT = 8080;

// Config paths
export const EMAILCLI_DIR = ".emailcli";
export const TOKENS_DIR = "tokens";
export const CONFIG_FILE = "config.json";
