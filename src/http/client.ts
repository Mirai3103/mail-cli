import { DEFAULT_TIMEOUT_MS, HTTP_BACKOFF_MS } from "../utils/constants.js";
import { CLIError } from "../utils/errors.js";

export interface RequestOptions extends RequestInit {
	timeout?: number;
}

export async function fetchWithRetry(
	url: string,
	options: RequestOptions = {},
	retries = 3,
	backoff = HTTP_BACKOFF_MS,
): Promise<Response> {
	const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				...fetchOptions,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok && attempt < retries) {
				const delay = backoff * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			return response;
		} catch (error) {
			if (attempt === retries) throw error;
			const delay = backoff * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw new CLIError("REQUEST_FAILED", "HTTP request failed after retries");
}
