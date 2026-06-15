#!/usr/bin/env node
import { startDaemon } from "../daemon/server.js";
import { defaultSocketPath } from "../ipc/socket-path.js";

type Args = {
  socket: string;
  ttlMs?: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { socket: defaultSocketPath() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--socket") {
      args.socket = requireValue(argv, (index += 1), arg);
    } else if (arg === "--ttl-ms") {
      args.ttlMs = Number(requireValue(argv, (index += 1), arg));
    } else if (arg === "--help") {
      process.stdout.write("usage: termplotd [--socket <path>] [--ttl-ms <ms>]\n");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function resolveTtlMs(flagValue: number | undefined): number | undefined {
  if (flagValue !== undefined) {
    return flagValue;
  }

  const envValue = process.env.TERMPLOTD_TTL_MS;
  if (!envValue) {
    return undefined;
  }

  const ttlMs = Number(envValue);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error(`TERMPLOTD_TTL_MS must be a positive finite number: ${envValue}`);
  }
  return ttlMs;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

try {
  const args = parseArgs(process.argv.slice(2));
  await startDaemon({ socketPath: args.socket, ttlMs: resolveTtlMs(args.ttlMs) });
  process.stderr.write(`termplotd_ready pid=${process.pid} socket=${args.socket}\n`);
} catch (error) {
  process.stderr.write(`termplotd_error=${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
