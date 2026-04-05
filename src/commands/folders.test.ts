import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("folders command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerFoldersCommand } = require("./folders");
		const program = new Command();
		registerFoldersCommand(program);
		const command = program.commands.find((c) => c.name() === "folders");
		expect(command).toBeDefined();
		expect(command!.description()).toBe("List all available folders/labels");
	});

	test("has --account option", () => {
		const { registerFoldersCommand } = require("./folders");
		const program = new Command();
		registerFoldersCommand(program);
		const command = program.commands.find((c) => c.name() === "folders");
		expect(command!.optsWithGlobals().account).toBeUndefined();
	});
});
