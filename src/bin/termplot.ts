#!/usr/bin/env node
import { defaultSocketPath } from "../ipc/socket-path.js";
import { getStatus, renew, restartDaemon, setTtl, startOrProbe, stopDaemon } from "../client/daemon.js";
import { IpcError, requestResult } from "../ipc/client.js";

type GlobalOptions = {
  socket: string;
  ttlMs?: number;
  logPath?: string;
  timeoutMs?: number;
  json?: string;
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
    } else if (arg === "--json") {
      options.json = requireValue(argv, (index += 1), arg);
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
  if (command[0] === "daemon") {
    await handleDaemon(command[1] ?? "status", options);
  } else if (command[0] === "render") {
    await handleRender(options);
  } else if (command[0] === "plots") {
    await handlePlots(command.slice(1), options);
  } else {
    throw new Error("usage: termplot <daemon|render|plots> ...");
  }
}

async function handleDaemon(action: string, options: GlobalOptions): Promise<void> {
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

async function handleRender(options: GlobalOptions): Promise<void> {
  if (!options.json) {
    throw new IpcError("INVALID_JSON", "render requires --json <json>");
  }

  let config: unknown;
  try {
    config = JSON.parse(options.json);
  } catch (error) {
    throw new IpcError("INVALID_JSON", error instanceof Error ? error.message : String(error));
  }

  printJson(await requestResult(options.socket, { method: "render", config }, { timeoutMs: 1_000 }));
}

async function handlePlots(command: string[], options: GlobalOptions): Promise<void> {
  const action = command[0] ?? "list";
  if (action === "list") {
    printJson(await requestResult(options.socket, { method: "listPlots" }, { timeoutMs: 1_000 }));
  } else if (action === "get") {
    printJson(await requestResult(options.socket, { method: "getPlot", plotId: requireCommandArg(command, 1, "id") }, {
      timeoutMs: 1_000,
    }));
  } else if (action === "delete") {
    printJson(await requestResult(options.socket, { method: "deletePlot", plotId: requireCommandArg(command, 1, "id") }, {
      timeoutMs: 1_000,
    }));
  } else if (action === "render-png") {
    printJson(await requestResult(options.socket, { method: "renderPng", plotId: requireCommandArg(command, 1, "id") }, {
      timeoutMs: 15_000,
    }));
  } else if (action === "clear") {
    printJson(await requestResult(options.socket, { method: "clearPlots" }, { timeoutMs: 1_000 }));
  } else {
    throw new Error(`unknown plots command: ${action}`);
  }
}

function requireCommandArg(command: string[], index: number, name: string): string {
  const value = command[index];
  if (!value) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

try {
  await main();
} catch (error) {
  if (error instanceof IpcError) {
    printJson({ ok: false, error: { code: error.code, message: error.message } });
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exit(1);
}
