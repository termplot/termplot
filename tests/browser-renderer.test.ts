import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import net from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const termplot = new URL("../bin/termplot.js", import.meta.url).pathname;

async function cli(args: string[], options: { reject?: boolean; timeout?: number } = {}) {
  try {
    return await execFileAsync(process.execPath, [termplot, ...args], {
      timeout: options.timeout ?? 20_000,
      maxBuffer: 20 * 1024 * 1024,
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

function pngDimensions(png: Buffer): { width: number; height: number } {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

async function portAccepts(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
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

async function waitForProcessExit(pid: number, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`process still running: ${pid}`);
}

async function waitForPortClosed(port: number, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (!(await portAccepts(port))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`port still accepts connections: ${port}`);
}

test("daemon renders stored Plotly config to PNG and reuses warm renderer", async () => {
  const dir = await mkdtemp(join(tmpdir(), "termplotd-browser-test-"));
  const socket = join(dir, "termplotd.sock");
  const log = join(dir, "termplotd.log");
  try {
    await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "10000", "--log", log]);
    const config = {
      data: [{ x: [1, 2, 3], y: [2, 1, 4], type: "scatter", mode: "lines+markers" }],
      layout: { width: 420, height: 320, title: { text: "Stage 4" } },
      config: { staticPlot: true },
    };
    const registered = parseJson(
      (await cli(["plots", "register", "--socket", socket, "--json", JSON.stringify(config)])).stdout,
    );

    const first = parseJson((await cli(["plots", "render-png", registered.id, "--socket", socket])).stdout);
    const second = parseJson((await cli(["plots", "render-png", registered.id, "--socket", socket])).stdout);

    for (const rendered of [first, second]) {
      assert.equal(rendered.plotId, registered.id);
      assert.equal(rendered.contentType, "image/png");
      assert.equal(rendered.width, 420);
      assert.equal(rendered.height, 320);
      assert.equal(typeof rendered.pngBase64, "string");
      assert.ok(rendered.pngBase64.length > 1000);
      assert.equal(rendered.timings.startedAt.length > 0, true);
      assert.equal(rendered.timings.totalMs >= 0, true);
      assert.equal(rendered.timings.plotReadyMs >= 0, true);
      const png = Buffer.from(rendered.pngBase64, "base64");
      assert.deepEqual(pngDimensions(png), { width: 420, height: 320 });
      assert.equal(await portAccepts(rendered.appPort), true);
    }

    assert.equal(first.browserPid, second.browserPid);
    assert.equal(first.rendererInstanceId, second.rendererInstanceId);

    await cli(["daemon", "stop", "--socket", socket]);
    await waitForPortClosed(first.appPort);
    if (first.browserPid) {
      await waitForProcessExit(first.browserPid);
    }
  } finally {
    await cli(["daemon", "stop", "--socket", socket], { reject: false });
    await rm(dir, { recursive: true, force: true });
  }
});

test("renderPng returns structured errors for missing plots", async () => {
  const dir = await mkdtemp(join(tmpdir(), "termplotd-browser-error-test-"));
  const socket = join(dir, "termplotd.sock");
  const log = join(dir, "termplotd.log");
  try {
    await cli(["daemon", "start", "--socket", socket, "--ttl-ms", "5000", "--log", log]);
    const missing = parseJson(
      (await cli(["plots", "render-png", "missing", "--socket", socket], { reject: false })).stdout,
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.error.code, "PLOT_NOT_FOUND");
  } finally {
    await cli(["daemon", "stop", "--socket", socket], { reject: false });
    await rm(dir, { recursive: true, force: true });
  }
});
