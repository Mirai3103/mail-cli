import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("reply command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerReplyCommand } = require("./reply");
		const program = new Command();
		registerReplyCommand(program);
		const command = program.commands.find((c) => c.name() === "reply");
		expect(command).toBeDefined();
		expect(command!.description()).toBe(
			"Reply to an existing email (with empty body)",
		);
	});

	test("accepts <id> argument", () => {
		const { registerReplyCommand } = require("./reply");
		const program = new Command();
		registerReplyCommand(program);
		const command = program.commands.find((c) => c.name() === "reply");
		expect(command!._args.length).toBe(1);
		expect(command!._args[0].name()).toBe("id");
	});

	test("has required --to option", () => {
		const { registerReplyCommand } = require("./reply");
		const program = new Command();
		registerReplyCommand(program);
		const command = program.commands.find((c) => c.name() === "reply");
		expect(command!.optsWithGlobals().to).toBeUndefined();
	});
});
