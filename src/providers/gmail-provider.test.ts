import { describe, test } from "bun:test";

describe("GmailProvider", () => {
	describe("read", () => {
		test("fetches message by ID and returns Email object", async () => {
			// Test case will be added when implementation exists
		});
	});

	describe("readThread", () => {
		test("fetches all messages in thread as array", async () => {
			// Test case will be added when implementation exists
		});
	});

	describe("search", () => {
		test("searches messages with query and limit", async () => {
			// Test case will be added when implementation exists
		});
	});

	describe("send", () => {
		test("sends email and returns message ID", async () => {
			// Test case will be added when implementation exists
		});
	});

	describe("reply", () => {
		test("replies to message with threading headers", async () => {
			// Test case will be added when implementation exists
		});
	});
});
