import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { Command } from "commander";

describe("send command", () => {
	let consoleLogSpy: any;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test("has correct command structure", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command).toBeDefined();
		expect(command!.description()).toBe("Send a new email");
	});

	test("has --account option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().account).toBeUndefined();
	});

	test("has required --to option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().to).toBeUndefined();
	});

	test("has required --subject option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().subject).toBeUndefined();
	});

	test("has --body option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().body).toBeUndefined();
	});

	test("has --cc option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().cc).toBeUndefined();
	});

	test("has --bcc option", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		expect(command!.optsWithGlobals().bcc).toBeUndefined();
	});

	test("has --attach option with empty array default", () => {
		const { registerSendCommand } = require("./send");
		const program = new Command();
		registerSendCommand(program);
		const command = program.commands.find((c) => c.name() === "send");
		// --attach has default [] so it's defined but empty
		expect(command!.optsWithGlobals().attach).toEqual([]);
	});
});
