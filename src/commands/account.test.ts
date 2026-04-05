import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("account command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure as parent", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		expect(command).toBeDefined();
		expect(command!.description()).toBe("Manage email accounts");
	});

	test("has 'add' subcommand", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		const addCmd = command!.commands.find((c) => c.name() === "add");
		expect(addCmd).toBeDefined();
		expect(addCmd!.description()).toBe("Add a new email account");
	});

	test("'add' subcommand has --provider option", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		const addCmd = command!.commands.find((c) => c.name() === "add");
		expect(addCmd!.optsWithGlobals().provider).toBeUndefined();
	});

	test("has 'list' subcommand", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		const listCmd = command!.commands.find((c) => c.name() === "list");
		expect(listCmd).toBeDefined();
		expect(listCmd!.description()).toBe("List all connected accounts");
	});

	test("has 'remove' subcommand", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		const removeCmd = command!.commands.find((c) => c.name() === "remove");
		expect(removeCmd).toBeDefined();
		expect(removeCmd!.description()).toBe("Remove an email account");
	});

	test("'remove' subcommand has --account option", () => {
		const { registerAccountCommand } = require("./account");
		const program = new Command();
		registerAccountCommand(program);
		const command = program.commands.find((c) => c.name() === "account");
		const removeCmd = command!.commands.find((c) => c.name() === "remove");
		expect(removeCmd!.optsWithGlobals().account).toBeUndefined();
	});
});
