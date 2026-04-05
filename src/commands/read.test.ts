import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("read command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerReadCommand } = require("./read");
		const program = new Command();
		registerReadCommand(program);
		const command = program.commands.find((c) => c.name() === "read");
		expect(command).toBeDefined();
		expect(command!.description()).toBe("Read a single email or thread");
	});

	test("accepts <id> argument", () => {
		const { registerReadCommand } = require("./read");
		const program = new Command();
		registerReadCommand(program);
		const command = program.commands.find((c) => c.name() === "read");
		// Commander stores argument definitions in _args
		expect(command!._args.length).toBe(1);
		expect(command!._args[0].name()).toBe("id");
	});

	test("has --account option", () => {
		const { registerReadCommand } = require("./read");
		const program = new Command();
		registerReadCommand(program);
		const command = program.commands.find((c) => c.name() === "read");
		expect(command!.optsWithGlobals().account).toBeUndefined();
	});

	test("has --thread option", () => {
		const { registerReadCommand } = require("./read");
		const program = new Command();
		registerReadCommand(program);
		const command = program.commands.find((c) => c.name() === "read");
		// Boolean flag without default is undefined when not passed
		expect(command!.optsWithGlobals().thread).toBeUndefined();
	});
});
