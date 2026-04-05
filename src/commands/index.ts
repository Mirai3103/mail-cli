import { Command } from "commander";
import { registerListCommand } from "./list.js";
import { registerStatusCommand } from "./status.js";
import { registerFoldersCommand } from "./folders.js";
import { registerReadCommand } from "./read.js";
import { registerSearchCommand } from "./search.js";
import { registerSendCommand } from "./send.js";
import { registerReplyCommand } from "./reply.js";
import { registerMarkCommand } from "./mark.js";
import { registerMoveCommand } from "./move.js";
import { registerDeleteCommand } from "./delete.js";
import { registerAccountCommand } from "./account.js";

export function registerCommands(program: Command) {
  registerListCommand(program);
  registerStatusCommand(program);
  registerFoldersCommand(program);
  registerReadCommand(program);
  registerSearchCommand(program);
  registerSendCommand(program);
  registerReplyCommand(program);
  registerMarkCommand(program);
  registerMoveCommand(program);
  registerDeleteCommand(program);
  registerAccountCommand(program);
}
