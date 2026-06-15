import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const termplot = new URL("../bin/termplot.js", import.meta.url).pathname;

type CliResult = {
  stdout: string;
  stderr: string;
};

async function cli(args: string[], options: { reject?: boolean } = {}): Promise<CliResult> {
  try {
    return await execFileAsync(process.execPath, [termplot, ...args], {
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
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

function parseJson(stdout: string): any {
  return JSON.parse(stdout);
}

async function withDaemon<T>(fn: (ctx: { dir: string; socket: string; pid: number }) => Promise<T>): Promise<T> {
  const dir = await mkdtemp("/tmp/tp-registry-");
  const socket = join(dir, "termplotd.sock");
  const log = join(dir, "termplotd.log");
  const started = parseJson(
    (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "5000", "--log", log])).stdout,
  );
  try {
    return await fn({ dir, socket, pid: started.status.pid });
  } finally {
    await cli(["daemon", "stop", "--socket", socket], { reject: false });
    await rm(dir, { recursive: true, force: true });
  }
}

test("render registers a plot and get/list/delete/clear operate on it", async () => {
  await withDaemon(async ({ socket }) => {
    const config = {
      data: [{ x: [1, 2], y: [3, 4], type: "scatter" }],
      layout: { width: 640, height: 480, title: "Registry" },
    };

    const rendered = parseJson(
      (await cli(["plots", "register", "--socket", socket, "--json", JSON.stringify(config)])).stdout,
    );
    assert.match(rendered.id, /^[0-9a-f-]{36}$/);
    assert.equal(rendered.width, 640);
    assert.equal(rendered.height, 480);
    assert.deepEqual(rendered.config, config);

    const listed = parseJson((await cli(["plots", "list", "--socket", socket])).stdout);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, rendered.id);
    assert.equal(listed[0].width, 640);
    assert.equal("config" in listed[0], false);

    const got = parseJson((await cli(["plots", "get", rendered.id, "--socket", socket])).stdout);
    assert.deepEqual(got.config, config);

    const deleted = parseJson((await cli(["plots", "delete", rendered.id, "--socket", socket])).stdout);
    assert.deepEqual(deleted, { deleted: true, id: rendered.id });
    assert.deepEqual(parseJson((await cli(["plots", "list", "--socket", socket])).stdout), []);

    const second = parseJson((await cli(["plots", "register", "--socket", socket, "--json", JSON.stringify(config)])).stdout);
    assert.notEqual(second.id, rendered.id);
    assert.deepEqual(parseJson((await cli(["plots", "clear", "--socket", socket])).stdout), { cleared: 1 });
    assert.deepEqual(parseJson((await cli(["plots", "list", "--socket", socket])).stdout), []);
  });
});

test("registry returns structured errors for missing plots and invalid input", async () => {
  await withDaemon(async ({ socket }) => {
    const missing = parseJson(
      (await cli(["plots", "get", "missing-id", "--socket", socket], { reject: false })).stdout,
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.error.code, "PLOT_NOT_FOUND");

    const nonObject = parseJson((await cli(["plots", "register", "--socket", socket, "--json", "[]"], { reject: false })).stdout);
    assert.equal(nonObject.ok, false);
    assert.equal(nonObject.error.code, "INVALID_PLOT_CONFIG");

    const badDimensions = parseJson(
      (await cli(["plots", "register", "--socket", socket, "--json", '{"layout":{"width":0}}'], { reject: false })).stdout,
    );
    assert.equal(badDimensions.ok, false);
    assert.equal(badDimensions.error.code, "INVALID_DIMENSIONS");

    const malformed = parseJson(
      (await cli(["plots", "register", "--socket", socket, "--json", '{"layout":'], { reject: false })).stdout,
    );
    assert.equal(malformed.ok, false);
    assert.equal(malformed.error.code, "INVALID_JSON");

    assert.deepEqual(parseJson((await cli(["plots", "list", "--socket", socket])).stdout), []);
  });
});

test("registry is in memory and clears across daemon restart", async () => {
  const dir = await mkdtemp("/tmp/tp-registry-restart-");
  const socket = join(dir, "termplotd.sock");
  const log = join(dir, "termplotd.log");
  try {
    const started = parseJson(
      (await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "5000", "--log", log])).stdout,
    );
    const rendered = parseJson(
      (await cli(["plots", "register", "--socket", socket, "--json", '{"layout":{"width":320,"height":240}}'])).stdout,
    );
    assert.equal(parseJson((await cli(["plots", "list", "--socket", socket])).stdout).length, 1);

    await cli(["daemon", "restart", "--socket", socket, "--ttl-ms", "5000", "--log", log]);
    const afterRestart = parseJson((await cli(["plots", "list", "--socket", socket])).stdout);
    assert.deepEqual(afterRestart, []);

    const missing = parseJson(
      (await cli(["plots", "get", rendered.id, "--socket", socket], { reject: false })).stdout,
    );
    assert.equal(missing.error.code, "PLOT_NOT_FOUND");
    assert.notEqual(parseJson((await cli(["daemon", "status", "--socket", socket])).stdout).status.pid, started.status.pid);
  } finally {
    await cli(["daemon", "stop", "--socket", socket], { reject: false });
    await rm(dir, { recursive: true, force: true });
  }
});
