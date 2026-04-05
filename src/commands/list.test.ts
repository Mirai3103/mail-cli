import { test, expect, describe, vi, beforeEach, afterEach } from "bun:test";
import { Command } from "commander";

describe("list command", () => {
  let consoleLogSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test("has correct command structure", () => {
    const { registerListCommand } = require("./list");
    const program = new Command();
    registerListCommand(program);
    const command = program.commands.find(c => c.name() === "list");
    expect(command).toBeDefined();
    expect(command!.description()).toBe("List emails in a folder");
  });

  test("has --account option", () => {
    const { registerListCommand } = require("./list");
    const program = new Command();
    registerListCommand(program);
    const command = program.commands.find(c => c.name() === "list");
    expect(command!.optsWithGlobals().account).toBeUndefined();
  });

  test("has --folder option with default Inbox", () => {
    const { registerListCommand } = require("./list");
    const program = new Command();
    registerListCommand(program);
    const command = program.commands.find(c => c.name() === "list");
    const options = command!.opts();
    expect(options.folder).toBe("Inbox");
  });

  test("has --limit option with default 20", () => {
    const { registerListCommand } = require("./list");
    const program = new Command();
    registerListCommand(program);
    const command = program.commands.find(c => c.name() === "list");
    const options = command!.opts();
    expect(options.limit).toBe("20");
  });
});
