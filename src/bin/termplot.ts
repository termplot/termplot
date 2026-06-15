#!/usr/bin/env node
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { defaultSocketPath } from "../ipc/socket-path.js";
import { getStatus, renew, restartDaemon, setTtl, startOrProbe, stopDaemon } from "../client/daemon.js";
import { IpcError, requestResult } from "../ipc/client.js";
import type { PlotRecord, RenderPngResult } from "../ipc/protocol.js";
import {
  DisplayError,
  encodeTerminalImage,
  resolveTerminalProtocol,
  type ResolvedTerminalProtocol,
  type TerminalProtocol,
} from "../display/protocols.js";

type GlobalOptions = {
  socket: string;
  ttlMs?: number;
  logPath?: string;
  timeoutMs?: number;
  json?: string;
  file?: string;
  output?: string;
  protocol?: TerminalProtocol;
};

const imageProtocols = new Set<TerminalProtocol>(["auto", "kitty", "iterm2", "sixel"]);

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
    } else if (arg === "--file") {
      options.file = requireValue(argv, (index += 1), arg);
    } else if (arg === "--output") {
      options.output = requireValue(argv, (index += 1), arg);
    } else if (arg === "--protocol") {
      options.protocol = parseProtocol(requireValue(argv, (index += 1), arg));
    } else {
      command.push(arg);
    }
  }

  return { command, options };
}

function parseProtocol(value: string): TerminalProtocol {
  if (imageProtocols.has(value as TerminalProtocol)) {
    return value as TerminalProtocol;
  }
  throw new IpcError("INVALID_PROTOCOL", `unsupported protocol: ${value}`);
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
    await handleRender(command.slice(1), options);
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

async function handleRender(command: string[], options: GlobalOptions): Promise<void> {
  const protocol = options.output ? options.protocol ?? "auto" : resolveTerminalProtocol(options.protocol ?? "auto");
  const config = await readPlotConfig(command, options);
  validatePlotConfig(config);

  const daemonStartedAt = Date.now();
  const daemon = await startOrProbe({
    socketPath: options.socket,
    ttlMs: options.ttlMs,
    logPath: options.logPath,
    timeoutMs: options.timeoutMs,
  });
  const daemonStartMs = Date.now() - daemonStartedAt;

  const registerStartedAt = Date.now();
  const record = await requestResult<PlotRecord>(options.socket, { method: "render", config }, {
    timeoutMs: options.timeoutMs ?? 1_000,
  });
  const registerMs = Date.now() - registerStartedAt;

  const rendered = await requestResult<RenderPngResult>(options.socket, { method: "renderPng", plotId: record.id }, {
    timeoutMs: options.timeoutMs ?? 15_000,
  });
  const png = Buffer.from(rendered.pngBase64, "base64");

  if (!options.output) {
    process.stdout.write(encodeTerminalImage(protocol as ResolvedTerminalProtocol, png));
    return;
  }

  await fs.mkdir(dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, png);

  printJson({
    ok: true,
    plotId: record.id,
    output: options.output,
    protocol,
    contentType: rendered.contentType,
    width: rendered.width,
    height: rendered.height,
    daemonPid: daemon.status.pid,
    startedDaemon: daemon.started,
    browserPid: rendered.browserPid,
    rendererInstanceId: rendered.rendererInstanceId,
    appPort: rendered.appPort,
    timings: {
      daemonStartMs,
      registerMs,
      render: rendered.timings,
    },
  });
}

async function handleRegister(options: GlobalOptions): Promise<void> {
  if (!options.json) {
    throw new IpcError("INVALID_JSON", "plots register requires --json <json>");
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
  } else if (action === "register") {
    await handleRegister(options);
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
      timeoutMs: options.timeoutMs ?? 15_000,
    }));
  } else if (action === "clear") {
    printJson(await requestResult(options.socket, { method: "clearPlots" }, { timeoutMs: 1_000 }));
  } else {
    throw new Error(`unknown plots command: ${action}`);
  }
}

async function readPlotConfig(command: string[], options: GlobalOptions): Promise<unknown> {
  if (command.length > 1) {
    throw new IpcError("INVALID_INPUT", "render accepts at most one positional JSON argument");
  }

  const sources = [
    options.json !== undefined ? "--json" : undefined,
    options.file !== undefined ? "--file" : undefined,
    command[0] !== undefined ? "argument" : undefined,
  ].filter(Boolean);

  if (sources.length > 1) {
    throw new IpcError("INVALID_INPUT", `render accepts exactly one JSON source, got: ${sources.join(", ")}`);
  }

  const useStdin = sources.length === 0 && !process.stdin.isTTY;
  if (sources.length === 0 && !useStdin) {
    throw new IpcError("INVALID_JSON", "render requires JSON from an argument, --file <path>, or stdin");
  }

  let text: string;
  if (options.json !== undefined) {
    text = options.json;
  } else if (options.file !== undefined) {
    text = await fs.readFile(options.file, "utf8");
  } else if (command[0] !== undefined) {
    text = command[0];
  } else {
    text = await readStdin();
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IpcError("INVALID_JSON", error instanceof Error ? error.message : String(error));
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validatePlotConfig(config: unknown): void {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new IpcError("INVALID_PLOT_CONFIG", "plot config must be a JSON object");
  }

  const layout = (config as Record<string, unknown>).layout;
  if (layout !== undefined && (!layout || typeof layout !== "object" || Array.isArray(layout))) {
    throw new IpcError("INVALID_PLOT_CONFIG", "plot config layout must be an object when present");
  }

  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return;
  }

  for (const name of ["width", "height"]) {
    const value = (layout as Record<string, unknown>)[name];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value <= 0)) {
      throw new IpcError("INVALID_DIMENSIONS", `${name} must be a positive finite number`);
    }
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
  } else if (error instanceof DisplayError) {
    printJson({ ok: false, error: { code: error.code, message: error.message } });
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exit(1);
}
