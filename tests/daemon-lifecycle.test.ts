import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const termplot = new URL("../bin/termplot.js", import.meta.url).pathname;
const termplotd = new URL("../bin/termplotd.js", import.meta.url).pathname;

type CliResult = {
  stdout: string;
  stderr: string;
};

async function cli(
  args: string[],
  options: { reject?: boolean; env?: NodeJS.ProcessEnv } = {},
): Promise<CliResult> {
  try {
    return await execFileAsync(process.execPath, [termplot, ...args], {
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, ...options.env },
    });
  } catch (error) {
    if (options.reject === false && error && typeof error === "object" && "stdout" in error && "stderr" in error) {
      return {
        stdout: String((error as { stdout: unknown }).stdout),
        stderr: String((error as { stderr: unknown }).stderr),
      };
    }
    throw error;
  }
}

async function waitForCliStatus(socket: string, timeoutMs = 2_000): Promise<any> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    const status = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout);
    if (status.running) {
      return status.status;
    }
    await sleep(25);
  }
  throw new Error(`timed out waiting for status on ${socket}`);
}

function parseJson(stdout: string): any {
  return JSON.parse(stdout);
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp("/tmp/tp-daemon-");
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function waitForExit(pid: number, timeoutMs = 2_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (!isRunning(pid)) {
      return;
    }
    await sleep(25);
  }
  throw new Error(`process still running after timeout: ${pid}`);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("status reports no daemon for a missing private socket", async () => {
  await withTempDir(async (dir) => {
    const socket = join(dir, "missing.sock");
    const result = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout);
    assert.equal(result.running, false);
    assert.equal(result.socketPath, socket);
  });
});

test("start probes before bind, reports status, renews TTL, and stops cleanly", async () => {
  await withTempDir(async (dir) => {
    const socket = join(dir, "termplotd.sock");
    const log = join(dir, "termplotd.log");

    const first = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "1000", "--log", log])).stdout,
    );
    assert.equal(first.started, true);
    assert.equal(first.status.socketPath, socket);
    assert.ok(first.status.pid > 0);
    assert.equal(fs.existsSync(socket), true);
    assert.equal(fs.existsSync(log), true);

    const second = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "1000", "--log", log])).stdout,
    );
    assert.equal(second.started, false);
    assert.equal(second.status.pid, first.status.pid);

    const status = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout);
    assert.equal(status.running, true);
    assert.equal(status.status.pid, first.status.pid);
    assert.equal(status.status.ttlMs, 1000);

    const ttl = parseJson((await cli(["daemon", "ttl", "--socket", socket, "--ttl-ms", "500"])).stdout);
    assert.equal(ttl.ttlMs, 500);

    const beforeStatus = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout).status;
    await sleep(50);
    const afterStatus = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout).status;
    assert.ok(afterStatus.idleRemainingMs < beforeStatus.idleRemainingMs);

    const renewed = parseJson((await cli(["daemon", "renew", "--socket", socket])).stdout);
    assert.ok(renewed.idleRemainingMs > afterStatus.idleRemainingMs);

    const stopped = parseJson((await cli(["daemon", "stop", "--socket", socket])).stdout);
    assert.equal(stopped.stopped, true);
    await waitForExit(first.status.pid);
    assert.equal(fs.existsSync(socket), false);
  });
});

test("restart replaces only the probe-owned daemon", async () => {
  await withTempDir(async (dir) => {
    const socket = join(dir, "termplotd.sock");
    const log = join(dir, "termplotd.log");
    const first = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "2000", "--log", log])).stdout,
    );
    const restarted = parseJson(
      (await cli(["daemon", "restart", "--socket", socket, "--ttl-ms", "2000", "--log", log])).stdout,
    );
    assert.equal(restarted.started, true);
    assert.notEqual(restarted.status.pid, first.status.pid);
    await waitForExit(first.status.pid);
    assert.equal(isRunning(restarted.status.pid), true);
    await cli(["daemon", "stop", "--socket", socket]);
    await waitForExit(restarted.status.pid);
    assert.equal(fs.existsSync(socket), false);
  });
});

test("direct termplotd refuses to steal a live socket", async () => {
  await withTempDir(async (dir) => {
    const socket = join(dir, "termplotd.sock");
    const log = join(dir, "termplotd.log");
    const started = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "5000", "--log", log])).stdout,
    );

    const second = await execFileAsync(process.execPath, [termplotd, "--socket", socket], {
      timeout: 2_000,
      maxBuffer: 1024 * 1024,
    }).catch((error: unknown) => error as { stdout: string; stderr: string; code: number });

    assert.equal("code" in second ? second.code : 0, 1);
    assert.match("stderr" in second ? second.stderr : "", /live daemon already owns socket/);

    const status = parseJson((await cli(["daemon", "status", "--socket", socket])).stdout);
    assert.equal(status.status.pid, started.status.pid);
    assert.equal(isRunning(started.status.pid), true);
    await cli(["daemon", "stop", "--socket", socket]);
    await waitForExit(started.status.pid);
    assert.equal(fs.existsSync(socket), false);
  });
});

test("TTL precedence supports env, flag, and runtime overrides", async () => {
  await withTempDir(async (dir) => {
    const envSocket = join(dir, "env.sock");
    const envLog = join(dir, "env.log");
    const envStarted = parseJson(
      (await cli(["daemon", "start", "--socket", envSocket, "--log", envLog], {
        env: { TERMPLOTD_TTL_MS: "1234" },
      })).stdout,
    );
    assert.equal(envStarted.status.ttlMs, 1234);
    await cli(["daemon", "stop", "--socket", envSocket]);
    await waitForExit(envStarted.status.pid);

    const flagSocket = join(dir, "flag.sock");
    const flagLog = join(dir, "flag.log");
    const flagStarted = parseJson(
      (await cli(["daemon", "start", "--socket", flagSocket, "--ttl-ms", "750", "--log", flagLog], {
        env: { TERMPLOTD_TTL_MS: "1234" },
      })).stdout,
    );
    assert.equal(flagStarted.status.ttlMs, 750);

    const runtime = parseJson((await cli(["daemon", "ttl", "--socket", flagSocket, "--ttl-ms", "300"])).stdout);
    assert.equal(runtime.ttlMs, 300);
    await cli(["daemon", "stop", "--socket", flagSocket]);
    await waitForExit(flagStarted.status.pid);
  });
});

test("idle expiry exits and unlinks the private socket", async () => {
  await withTempDir(async (dir) => {
    const socket = join(dir, "termplotd.sock");
    const log = join(dir, "termplotd.log");
    const started = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "150", "--log", log])).stdout,
    );
    await waitForExit(started.status.pid, 3_000);
    assert.equal(fs.existsSync(socket), false);
  });
});

test("SIGTERM and SIGINT clean up only spawned daemon sockets", async () => {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    await withTempDir(async (dir) => {
      const socket = join(dir, `${signal}.sock`);
      const log = join(dir, `${signal}.log`);
      const started = parseJson(
        (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "5000", "--log", log])).stdout,
      );
      process.kill(started.status.pid, signal);
      await waitForExit(started.status.pid);
      assert.equal(fs.existsSync(socket), false);
    });
  }
});

test("startup failure is bounded and reports a clear error", async () => {
  await withTempDir(async (dir) => {
    const blockedPath = join(dir, "not-a-directory");
    fs.writeFileSync(blockedPath, "blocked");
    const socket = join(blockedPath, "termplotd.sock");
    const result = await cli(
      ["daemon", "start", "--socket", socket, "--timeout-ms", "200", "--log", join(dir, "failure.log")],
      { reject: false },
    );
    assert.match(result.stderr, /EEXIST|ENOENT|ENOTDIR|timed out waiting for termplotd readiness/);
    assert.equal(fs.existsSync(socket), false);
  });
});
