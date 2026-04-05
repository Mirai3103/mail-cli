import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";
import type { Draft } from "../types/domain.js";

const DRAFTS_FILENAME = "drafts.json";
const EMAILCLI_DIR = ".emailcli";

function getDraftsPath(): string {
	return path.join(homedir(), EMAILCLI_DIR, DRAFTS_FILENAME);
}

async function ensureDir(): Promise<void> {
	const dir = path.join(homedir(), EMAILCLI_DIR);
	try {
		await fs.mkdir(dir, { recursive: true });
	} catch {
		// Dir already exists
	}
}

export class DraftStorage {
	/**
	 * Load all drafts from disk.
	 */
	async loadAll(): Promise<Draft[]> {
		const filePath = getDraftsPath();
		try {
			const content = await fs.readFile(filePath, "utf-8");
			const data = JSON.parse(content);
			return Array.isArray(data) ? data : [];
		} catch {
			// File doesn't exist or is invalid - return empty array
			return [];
		}
	}

	/**
	 * Save all drafts to disk.
	 */
	async saveAll(drafts: Draft[]): Promise<void> {
		await ensureDir();
		const filePath = getDraftsPath();
		await fs.writeFile(filePath, JSON.stringify(drafts, null, 2), "utf-8");
	}

	/**
	 * Get a draft by ID.
	 */
	async getById(id: string): Promise<Draft | null> {
		const drafts = await this.loadAll();
		return drafts.find((d) => d.id === id) || null;
	}

	/**
	 * List all drafts for a specific account.
	 */
	async listByAccount(account: string): Promise<Draft[]> {
		const drafts = await this.loadAll();
		return drafts.filter((d) => d.account === account);
	}

	/**
	 * Save a draft (create or update).
	 */
	async save(draft: Draft): Promise<void> {
		const drafts = await this.loadAll();
		const index = drafts.findIndex((d) => d.id === draft.id);
		if (index >= 0) {
			drafts[index] = draft;
		} else {
			drafts.push(draft);
		}
		await this.saveAll(drafts);
	}

	/**
	 * Delete a draft by ID.
	 */
	async delete(id: string): Promise<boolean> {
		const drafts = await this.loadAll();
		const index = drafts.findIndex((d) => d.id === id);
		if (index < 0) {
			return false;
		}
		drafts.splice(index, 1);
		await this.saveAll(drafts);
		return true;
	}
}
