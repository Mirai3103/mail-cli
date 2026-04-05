import { test, expect, describe, vi, beforeEach, afterEach } from "bun:test";
import { Command } from "commander";

describe("move command", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("has correct command structure", () => {
    const { registerMoveCommand } = require("./move");
    const program = new Command();
    registerMoveCommand(program);
    const command = program.commands.find(c => c.name() === "move");
    expect(command).toBeDefined();
    expect(command!.description()).toBe("Move email to a folder/label");
  });

  test("has optional [id] argument", () => {
    const { registerMoveCommand } = require("./move");
    const program = new Command();
    registerMoveCommand(program);
    const command = program.commands.find(c => c.name() === "move");
    expect(command!._args.length).toBe(1);
    expect(command!._args[0].name()).toBe("id");
  });

  test("has required --folder option", () => {
    const { registerMoveCommand } = require("./move");
    const program = new Command();
    registerMoveCommand(program);
    const command = program.commands.find(c => c.name() === "move");
    expect(command!.optsWithGlobals().folder).toBeUndefined();
  });

  test("has --ids option for batch", () => {
    const { registerMoveCommand } = require("./move");
    const program = new Command();
    registerMoveCommand(program);
    const command = program.commands.find(c => c.name() === "move");
    expect(command!.optsWithGlobals().ids).toBeUndefined();
  });
});
