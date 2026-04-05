import { test, expect, describe, vi, beforeEach, afterEach } from "bun:test";
import { Command } from "commander";

describe("mark command", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("has correct command structure", () => {
    const { registerMarkCommand } = require("./mark");
    const program = new Command();
    registerMarkCommand(program);
    const command = program.commands.find(c => c.name() === "mark");
    expect(command).toBeDefined();
    expect(command!.description()).toBe("Mark email as read or unread");
  });

  test("has optional [id] argument", () => {
    const { registerMarkCommand } = require("./mark");
    const program = new Command();
    registerMarkCommand(program);
    const command = program.commands.find(c => c.name() === "mark");
    expect(command!._args.length).toBe(1);
    expect(command!._args[0].name()).toBe("id");
  });

  test("has --read and --unread options (boolean flags)", () => {
    const { registerMarkCommand } = require("./mark");
    const program = new Command();
    registerMarkCommand(program);
    const command = program.commands.find(c => c.name() === "mark");
    // Boolean flags without defaults are undefined when not passed
    expect(command!.optsWithGlobals().read).toBeUndefined();
    expect(command!.optsWithGlobals().unread).toBeUndefined();
  });

  test("has --ids option for batch", () => {
    const { registerMarkCommand } = require("./mark");
    const program = new Command();
    registerMarkCommand(program);
    const command = program.commands.find(c => c.name() === "mark");
    expect(command!.optsWithGlobals().ids).toBeUndefined();
  });
});
