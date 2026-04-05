import type { Command } from "commander";
import { registerAccountCommand } from "./account.js";
import { registerDeleteCommand } from "./delete.js";
import { registerFoldersCommand } from "./folders.js";
import { registerListCommand } from "./list.js";
import { registerMarkCommand } from "./mark.js";
import { registerMoveCommand } from "./move.js";
import { registerReadCommand } from "./read.js";
import { registerReplyCommand } from "./reply.js";
import { registerSearchCommand } from "./search.js";
import { registerSendCommand } from "./send.js";
import { registerStatusCommand } from "./status.js";

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
