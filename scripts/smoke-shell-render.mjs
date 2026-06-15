import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const dir = "/tmp/tp-stage9-shell";
const socket = join(dir, "termplotd.sock");
const output = join(dir, "plot.png");
const termplot = new URL("../build/bin/termplot.js", import.meta.url).pathname;
const config = {
  data: [{ x: [1, 2, 3], y: [2, 5, 3], type: "scatter" }],
  layout: { width: 240, height: 180 },
  config: { staticPlot: true },
};

await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });

try {
  await execFileAsync(process.execPath, [
    termplot,
    "render",
    JSON.stringify(config),
    "--socket",
    socket,
    "--ttl-ms",
    "60000",
    "--timeout-ms",
    "60000",
    "--output",
    output,
  ], { timeout: 90_000, maxBuffer: 20 * 1024 * 1024 });

  const png = fs.readFileSync(output);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 240);
  assert.equal(png.readUInt32BE(20), 180);

  console.log(JSON.stringify({ ok: true, output, width: 240, height: 180 }));
} finally {
  await execFileAsync(process.execPath, [termplot, "daemon", "stop", "--socket", socket], {
    timeout: 5_000,
  }).catch(() => undefined);
  await rm(dir, { recursive: true, force: true });
}
