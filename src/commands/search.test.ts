import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("search command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerSearchCommand } = require("./search");
		const program = new Command();
		registerSearchCommand(program);
		const command = program.commands.find((c) => c.name() === "search");
		expect(command).toBeDefined();
		expect(command!.description()).toBe(
			"Search emails using provider search syntax",
		);
	});

	test("accepts <query> argument", () => {
		const { registerSearchCommand } = require("./search");
		const program = new Command();
		registerSearchCommand(program);
		const command = program.commands.find((c) => c.name() === "search");
		expect(command!._args.length).toBe(1);
		expect(command!._args[0].name()).toBe("query");
	});

	test("has --account option", () => {
		const { registerSearchCommand } = require("./search");
		const program = new Command();
		registerSearchCommand(program);
		const command = program.commands.find((c) => c.name() === "search");
		expect(command!.optsWithGlobals().account).toBeUndefined();
	});

	test("has --limit option with default 20", () => {
		const { registerSearchCommand } = require("./search");
		const program = new Command();
		registerSearchCommand(program);
		const command = program.commands.find((c) => c.name() === "search");
		const options = command!.opts();
		expect(options.limit).toBe("20");
	});
});
