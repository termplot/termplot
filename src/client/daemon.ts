import { spawn } from "node:child_process";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Status } from "../ipc/protocol.js";
import { IpcError, requestResult } from "../ipc/client.js";

export type StartOptions = {
  socketPath: string;
  ttlMs?: number;
  logPath?: string;
  timeoutMs?: number;
};

export async function getStatus(socketPath: string): Promise<Status | undefined> {
  try {
    return await requestResult<Status>(socketPath, { method: "status" }, { timeoutMs: 500 });
  } catch (error) {
    if (error instanceof IpcError) {
      return undefined;
    }
    throw error;
  }
}

export async function startOrProbe(options: StartOptions): Promise<{ started: boolean; status: Status }> {
  const existing = await getStatus(options.socketPath);
  if (existing) {
    return { started: false, status: existing };
  }

  fs.mkdirSync(dirname(options.socketPath), { recursive: true });
  if (options.logPath) {
    fs.mkdirSync(dirname(options.logPath), { recursive: true });
  }

  const daemonPath = resolve(dirname(fileURLToPath(import.meta.url)), "../bin/termplotd.js");
  const args = [daemonPath, "--socket", options.socketPath];
  if (options.ttlMs !== undefined) {
    args.push("--ttl-ms", String(options.ttlMs));
  }

  const logFd = options.logPath ? fs.openSync(options.logPath, "a") : "ignore";
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  if (typeof logFd === "number") {
    fs.closeSync(logFd);
  }

  const status = await waitForStatus(options.socketPath, options.timeoutMs ?? 2_000, options.logPath);
  return { started: true, status };
}

export async function stopDaemon(socketPath: string): Promise<{ stopped: boolean }> {
  const existing = await getStatus(socketPath);
  if (!existing) {
    return { stopped: false };
  }
  await requestResult(socketPath, { method: "shutdown" }, { timeoutMs: 1_000 });
  await waitForMissing(socketPath, 2_000);
  return { stopped: true };
}

export async function restartDaemon(options: StartOptions): Promise<{ started: boolean; status: Status }> {
  await stopDaemon(options.socketPath);
  return await startOrProbe(options);
}

export async function setTtl(socketPath: string, ttlMs: number): Promise<Status> {
  return await requestResult<Status>(socketPath, { method: "setTtl", ttlMs }, { timeoutMs: 1_000 });
}

export async function renew(socketPath: string): Promise<Status> {
  return await requestResult<Status>(socketPath, { method: "renew" }, { timeoutMs: 1_000 });
}

async function waitForStatus(
  socketPath: string,
  timeoutMs: number,
  logPath: string | undefined,
): Promise<Status> {
  const startedAt = Date.now();
  let lastError = "";
  while (Date.now() - startedAt <= timeoutMs) {
    const status = await getStatus(socketPath);
    if (status) {
      return status;
    }
    lastError = logPath && fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trim() : "";
    await sleep(25);
  }
  throw new Error(
    `timed out waiting for termplotd readiness on ${socketPath}${lastError ? `; log: ${lastError}` : ""}`,
  );
}

async function waitForMissing(socketPath: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (!fs.existsSync(socketPath)) {
      return;
    }
    await sleep(25);
  }
  throw new Error(`timed out waiting for socket unlink: ${socketPath}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
