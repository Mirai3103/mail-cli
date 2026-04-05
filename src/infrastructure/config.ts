import type { ConfigPort } from "../types/ports.js";
import { getConfigPath, loadConfig } from "../utils/config.js";

/**
 * ConfigImpl implements ConfigPort using file-based config storage.
 * Config is loaded from ~/.emailcli/config.json with environment variable overrides.
 */
export class ConfigImpl implements ConfigPort {
	async loadConfig() {
		return await loadConfig();
	}

	getConfigPath(): string {
		return getConfigPath();
	}
}
