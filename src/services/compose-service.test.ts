import { beforeEach, describe, expect, test, vi } from "bun:test";
import { mockEmailProvider } from "../test/mocks";
import { ComposeService } from "./compose-service";

describe("ComposeService", () => {
	let service: ComposeService;

	beforeEach(() => {
		service = new ComposeService(mockEmailProvider);
		vi.clearAllMocks();
	});

	describe("send", () => {
		test("delegates to provider.send with options", async () => {
			const options = {
				to: ["recipient@example.com"],
				subject: "Test Subject",
				body: "Test body",
			};
			await service.send(options);
			expect(mockEmailProvider.send).toHaveBeenCalledWith(options);
		});

		test("returns id wrapped in object", async () => {
			mockEmailProvider.send = vi.fn().mockResolvedValue("msg-new-123");
			const service = new ComposeService(mockEmailProvider);
			const result = await service.send({
				to: ["recipient@example.com"],
				subject: "Test",
				body: "Body",
			});
			expect(result).toEqual({ id: "msg-new-123" });
		});
	});

	describe("reply", () => {
		test("delegates to provider.reply with id and options", async () => {
			const options = { to: ["sender@example.com"], cc: ["cc@example.com"] };
			await service.reply("msg-123", options);
			expect(mockEmailProvider.reply).toHaveBeenCalledWith("msg-123", {
				to: ["sender@example.com"],
				cc: ["cc@example.com"],
				bcc: undefined,
				subject: "",
				body: "",
			});
		});

		test("returns reply id wrapped in object", async () => {
			mockEmailProvider.reply = vi.fn().mockResolvedValue("reply-new-456");
			const service = new ComposeService(mockEmailProvider);
			const result = await service.reply("msg-123", {
				to: ["sender@example.com"],
			});
			expect(result).toEqual({ id: "reply-new-456" });
		});

		test("fills in optional fields with defaults", async () => {
			await service.reply("msg-123", { to: ["sender@example.com"] });
			expect(mockEmailProvider.reply).toHaveBeenCalledWith("msg-123", {
				to: ["sender@example.com"],
				cc: undefined,
				bcc: undefined,
				subject: "",
				body: "",
			});
		});
	});
});
