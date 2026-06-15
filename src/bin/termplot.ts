#!/usr/bin/env node
import { defaultSocketPath } from "../ipc/socket-path.js";
import { getStatus, renew, restartDaemon, setTtl, startOrProbe, stopDaemon } from "../client/daemon.js";

type GlobalOptions = {
  socket: string;
  ttlMs?: number;
  logPath?: string;
  timeoutMs?: number;
};

function parseOptions(argv: string[]): { command: string[]; options: GlobalOptions } {
  const command: string[] = [];
  const options: GlobalOptions = { socket: defaultSocketPath() };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--socket") {
      options.socket = requireValue(argv, (index += 1), arg);
    } else if (arg === "--ttl-ms") {
      options.ttlMs = Number(requireValue(argv, (index += 1), arg));
    } else if (arg === "--log") {
      options.logPath = requireValue(argv, (index += 1), arg);
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(argv, (index += 1), arg));
    } else {
      command.push(arg);
    }
  }

  return { command, options };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  const { command, options } = parseOptions(process.argv.slice(2));
  if (command[0] !== "daemon") {
    throw new Error("usage: termplot daemon <status|start|stop|restart|ttl|renew> [options]");
  }

  const action = command[1] ?? "status";
  if (action === "status") {
    const status = await getStatus(options.socket);
    printJson(status ? { running: true, status } : { running: false, socketPath: options.socket });
  } else if (action === "start") {
    printJson(await startOrProbe({
      socketPath: options.socket,
      ttlMs: options.ttlMs,
      logPath: options.logPath,
      timeoutMs: options.timeoutMs,
    }));
  } else if (action === "stop") {
    printJson(await stopDaemon(options.socket));
  } else if (action === "restart") {
    printJson(await restartDaemon({
      socketPath: options.socket,
      ttlMs: options.ttlMs,
      logPath: options.logPath,
      timeoutMs: options.timeoutMs,
    }));
  } else if (action === "ttl") {
    if (options.ttlMs === undefined) {
      throw new Error("daemon ttl requires --ttl-ms <ms>");
    }
    printJson(await setTtl(options.socket, options.ttlMs));
  } else if (action === "renew") {
    printJson(await renew(options.socket));
  } else {
    throw new Error(`unknown daemon command: ${action}`);
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
