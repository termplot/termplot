import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const termplot = new URL("../bin/termplot.js", import.meta.url).pathname;

type CliResult = {
  stdout: string;
  stderr: string;
};

async function cli(args: string[], options: { reject?: boolean; timeout?: number } = {}): Promise<CliResult> {
  try {
    return await execFileAsync(process.execPath, [termplot, ...args], {
      timeout: options.timeout ?? 30_000,
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

async function cliWithStdin(args: string[], stdin: string): Promise<CliResult> {
  return await new Promise<CliResult>((resolve, reject) => {
    const child = spawn(process.execPath, [termplot, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`termplot timed out: ${args.join(" ")}`));
    }, 30_000);

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(`termplot exited ${code}: ${result.stderr || result.stdout}`));
      }
    });

    child.stdin.end(stdin);
  });
}

function parseJson(stdout: string): any {
  return JSON.parse(stdout);
}

function pngDimensions(path: string): { width: number; height: number } {
  const png = fs.readFileSync(path);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

async function withTempDir<T>(prefix: string, fn: (ctx: { dir: string; socket: string; log: string }) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await fn({
      dir,
      socket: join(dir, "termplotd.sock"),
      log: join(dir, "termplotd.log"),
    });
  } finally {
    await cli(["daemon", "stop", "--socket", join(dir, "termplotd.sock")], { reject: false, timeout: 5_000 });
    await rm(dir, { recursive: true, force: true });
  }
}

test("render writes PNG from positional JSON and reuses an auto-started daemon", async () => {
  await withTempDir("termplot-cli-render-test-", async ({ dir, socket, log }) => {
    const firstOutput = join(dir, "first.png");
    const secondOutput = join(dir, "second.png");
    const config = {
      data: [{ x: [1, 2, 3], y: [3, 2, 5], type: "scatter" }],
      layout: { width: 360, height: 260, title: { text: "CLI" } },
      config: { staticPlot: true },
    };

    const first = parseJson(
      (await cli([
        "render",
        JSON.stringify(config),
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--timeout-ms",
        "20000",
        "--output",
        firstOutput,
      ])).stdout,
    );
    const second = parseJson(
      (await cli([
        "render",
        JSON.stringify(config),
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--timeout-ms",
        "20000",
        "--output",
        secondOutput,
        "--protocol",
        "kitty",
      ])).stdout,
    );

    assert.equal(first.ok, true);
    assert.equal(first.startedDaemon, true);
    assert.equal(second.ok, true);
    assert.equal(second.startedDaemon, false);
    assert.equal(second.daemonPid, first.daemonPid);
    assert.equal(second.protocol, "kitty");
    assert.match(first.plotId, /^[0-9a-f-]{36}$/);
    assert.notEqual(first.plotId, second.plotId);
    assert.equal(first.contentType, "image/png");
    assert.equal(first.width, 360);
    assert.equal(first.height, 260);
    assert.equal(typeof first.daemonPid, "number");
    assert.equal(first.daemonPid > 0, true);
    assert.deepEqual(pngDimensions(firstOutput), { width: 360, height: 260 });
    assert.deepEqual(pngDimensions(secondOutput), { width: 360, height: 260 });
    assert.equal("pngBase64" in first, false);
    assert.equal(typeof first.timings.daemonStartMs, "number");
    assert.equal(typeof first.timings.registerMs, "number");
    assert.equal(typeof first.timings.render.startedAt, "string");
    assert.equal(typeof first.timings.render.appReadyMs, "number");
    assert.equal(typeof first.timings.render.plotReadyMs, "number");
    assert.equal(typeof first.timings.render.screenshotMs, "number");
    assert.equal(first.timings.render.totalMs >= 0, true);
  });
});

test("render accepts JSON from --file and stdin", async () => {
  await withTempDir("termplot-cli-input-test-", async ({ dir, socket, log }) => {
    const fileConfig = join(dir, "plot.json");
    const fileOutput = join(dir, "file.png");
    const stdinOutput = join(dir, "stdin.png");
    const config = {
      data: [{ x: ["a", "b"], y: [1, 4], type: "bar" }],
      layout: { width: 300, height: 220 },
      config: { staticPlot: true },
    };
    await writeFile(fileConfig, JSON.stringify(config));

    const fromFile = parseJson(
      (await cli([
        "render",
        "--file",
        fileConfig,
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--timeout-ms",
        "20000",
        "--output",
        fileOutput,
      ])).stdout,
    );
    const fromStdin = parseJson(
      (await cliWithStdin([
        "render",
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--timeout-ms",
        "20000",
        "--output",
        stdinOutput,
      ], JSON.stringify(config))).stdout,
    );

    assert.equal(fromFile.ok, true);
    assert.equal(fromStdin.ok, true);
    assert.equal(fromStdin.daemonPid, fromFile.daemonPid);
    assert.deepEqual(pngDimensions(fileOutput), { width: 300, height: 220 });
    assert.deepEqual(pngDimensions(stdinOutput), { width: 300, height: 220 });
  });
});

test("render returns structured errors before writing output for invalid input", async () => {
  await withTempDir("termplot-cli-error-test-", async ({ dir, socket, log }) => {
    const malformedOutput = join(dir, "malformed.png");
    const badDimensionsOutput = join(dir, "bad-dimensions.png");

    const malformed = parseJson(
      (await cli([
        "render",
        "{\"layout\":",
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--output",
        malformedOutput,
      ], { reject: false })).stdout,
    );
    const badDimensions = parseJson(
      (await cli([
        "render",
        "{\"layout\":{\"width\":0}}",
        "--socket",
        socket,
        "--ttl-ms",
        "10000",
        "--log",
        log,
        "--output",
        badDimensionsOutput,
      ], { reject: false })).stdout,
    );

    assert.equal(malformed.ok, false);
    assert.equal(malformed.error.code, "INVALID_JSON");
    assert.equal(fs.existsSync(malformedOutput), false);
    assert.equal(badDimensions.ok, false);
    assert.equal(badDimensions.error.code, "INVALID_DIMENSIONS");
    assert.equal(fs.existsSync(badDimensionsOutput), false);
  });
});

test("render rejects terminal display until Stage 6", async () => {
  const result = parseJson(
    (await cli([
      "render",
      "{\"layout\":{\"width\":160,\"height\":120}}",
      "--protocol",
      "iterm2",
    ], { reject: false })).stdout,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "TERMINAL_DISPLAY_DEFERRED");
});
