import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("delete command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerDeleteCommand } = require("./delete");
		const program = new Command();
		registerDeleteCommand(program);
		const command = program.commands.find((c) => c.name() === "delete");
		expect(command).toBeDefined();
		expect(command!.description()).toBe("Move email to trash");
	});

	test("has optional [id] argument", () => {
		const { registerDeleteCommand } = require("./delete");
		const program = new Command();
		registerDeleteCommand(program);
		const command = program.commands.find((c) => c.name() === "delete");
		expect(command!._args.length).toBe(1);
		expect(command!._args[0].name()).toBe("id");
	});

	test("has --ids option for batch", () => {
		const { registerDeleteCommand } = require("./delete");
		const program = new Command();
		registerDeleteCommand(program);
		const command = program.commands.find((c) => c.name() === "delete");
		expect(command!.optsWithGlobals().ids).toBeUndefined();
	});
});
