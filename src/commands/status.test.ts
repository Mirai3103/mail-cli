import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("status command", () => {
	let consoleLogSpy: any;
	let processExitSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		processExitSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerStatusCommand } = require("./status");
		const program = new Command();
		registerStatusCommand(program);
		const command = program.commands.find((c) => c.name() === "status");
		expect(command).toBeDefined();
		expect(command!.description()).toBe(
			"Get mailbox status (unread and total message counts)",
		);
	});

	test("has --account option", () => {
		const { registerStatusCommand } = require("./status");
		const program = new Command();
		registerStatusCommand(program);
		const command = program.commands.find((c) => c.name() === "status");
		expect(command!.optsWithGlobals().account).toBeUndefined();
	});
});
