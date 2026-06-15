import fs from "node:fs";
import net from "node:net";
import type { Request, Response, Status } from "../ipc/protocol.js";
import { isRequest } from "../ipc/protocol.js";
import { PlotRegistry, RegistryError } from "./plot-registry.js";
import { BrowserRenderer, RenderError } from "../renderer/browser-renderer.js";

export type DaemonOptions = {
  socketPath: string;
  ttlMs?: number;
};

export type RunningDaemon = {
  server: net.Server;
  socketPath: string;
  stop: () => Promise<void>;
};

const DEFAULT_TTL_MS = 60 * 60 * 1_000;

function ok(id: string | undefined, result: unknown): Response {
  return { ok: true, id, result };
}

function fail(id: string | undefined, code: string, message: string): Response {
  return { ok: false, id, error: { code, message } };
}

export async function startDaemon(options: DaemonOptions): Promise<RunningDaemon> {
  const socketPath = options.socketPath;
  const started = Date.now();
  let ttlMs = normalizeTtl(options.ttlMs ?? DEFAULT_TTL_MS);
  let idleDeadline = Date.now() + ttlMs;
  let stopping = false;
  let idleTimer: NodeJS.Timeout | undefined;
  const registry = new PlotRegistry();
  let renderer: BrowserRenderer | undefined;
  const server = net.createServer();

  function status(): Status {
    const now = Date.now();
    return {
      pid: process.pid,
      socketPath,
      startedAt: new Date(started).toISOString(),
      uptimeMs: now - started,
      ttlMs,
      idleDeadlineAt: new Date(idleDeadline).toISOString(),
      idleRemainingMs: Math.max(0, idleDeadline - now),
    };
  }

  function scheduleIdleTimer(): void {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      void stop();
    }, Math.max(1, idleDeadline - Date.now()));
    idleTimer.unref();
  }

  function renew(): Status {
    idleDeadline = Date.now() + ttlMs;
    scheduleIdleTimer();
    return status();
  }

  async function stop(): Promise<void> {
    if (stopping) {
      return;
    }
    stopping = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      for (const connection of connections) {
        connection.destroy();
      }
    });
    if (renderer) {
      await renderer.close();
      renderer = undefined;
    }
    unlinkSocket(socketPath);
  }

  const connections = new Set<net.Socket>();
  server.on("connection", (socket) => {
    connections.add(socket);
    socket.setEncoding("utf8");
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        void handleLine(socket, line);
        newline = buffer.indexOf("\n");
      }
    });
    socket.on("close", () => {
      connections.delete(socket);
    });
  });

  async function handleLine(socket: net.Socket, line: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      writeResponse(socket, fail(undefined, "BAD_JSON", "request was not valid JSON"));
      return;
    }

    if (!isRequest(parsed)) {
      writeResponse(socket, fail(undefined, "BAD_REQUEST", "request shape is invalid"));
      return;
    }

    const request = parsed as Request;
    try {
      if (request.method === "status") {
        writeResponse(socket, ok(request.id, status()));
      } else if (request.method === "renew") {
        writeResponse(socket, ok(request.id, renew()));
      } else if (request.method === "setTtl") {
        ttlMs = normalizeTtl(request.ttlMs);
        writeResponse(socket, ok(request.id, renew()));
      } else if (request.method === "render") {
        const record = registry.render(request.config);
        renew();
        writeResponse(socket, ok(request.id, record));
      } else if (request.method === "renderPng") {
        renderer ??= new BrowserRenderer((id) => registry.get(id));
        const rendered = await renderer.renderPng(request.plotId);
        renew();
        writeResponse(socket, ok(request.id, rendered));
      } else if (request.method === "getPlot") {
        writeResponse(socket, ok(request.id, registry.get(request.plotId)));
      } else if (request.method === "listPlots") {
        writeResponse(socket, ok(request.id, registry.list()));
      } else if (request.method === "deletePlot") {
        writeResponse(socket, ok(request.id, registry.delete(request.plotId)));
      } else if (request.method === "clearPlots") {
        writeResponse(socket, ok(request.id, registry.clear()));
      } else if (request.method === "shutdown") {
        writeResponse(socket, ok(request.id, { shuttingDown: true, pid: process.pid }));
        socket.end();
        setImmediate(() => {
          void stop().then(() => {
            process.exitCode = 0;
          });
        });
      }
    } catch (error) {
      if (error instanceof RegistryError) {
        writeResponse(socket, fail(request.id, error.code, error.message));
      } else if (error instanceof RenderError) {
        writeResponse(socket, fail(request.id, error.code, error.message));
      } else {
        writeResponse(
          socket,
          fail(request.id, "INTERNAL_ERROR", error instanceof Error ? error.message : String(error)),
        );
      }
    }
  }

  await removeOnlyStaleSocket(socketPath);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });

  scheduleIdleTimer();

  const signalHandler = (): void => {
    void stop().then(() => {
      process.exit(0);
    });
  };
  process.once("SIGTERM", signalHandler);
  process.once("SIGINT", signalHandler);

  return { server, socketPath, stop };
}

function writeResponse(socket: net.Socket, response: Response): void {
  socket.write(`${JSON.stringify(response)}\n`);
}

function normalizeTtl(ttlMs: number): number {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error(`ttlMs must be a positive finite number: ${ttlMs}`);
  }
  return Math.trunc(ttlMs);
}

function unlinkSocket(socketPath: string): void {
  try {
    fs.unlinkSync(socketPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function removeOnlyStaleSocket(socketPath: string): Promise<void> {
  if (!fs.existsSync(socketPath)) {
    return;
  }

  if (await socketResponds(socketPath)) {
    throw new Error(`refusing to start: live daemon already owns socket ${socketPath}`);
  }

  unlinkSocket(socketPath);
}

async function socketResponds(socketPath: string): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = net.createConnection(socketPath);
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 250);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
