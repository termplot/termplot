import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const nu = findCommand("nu");
const dir = "/tmp/tp-stage9-nu";
const socket = join(dir, "termplotd.sock");
const output = join(dir, "plot.png");
const script = join(dir, "run.nu");
const termplot = new URL("../build/bin/termplot.js", import.meta.url).pathname;
const termplotNu = new URL("../termplot.nu", import.meta.url).pathname;

if (!nu) {
  throw new Error("nu is required for the Nushell smoke test");
}

await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });

await writeFile(
  script,
  `
source ${JSON.stringify(termplotNu)}

let plot = {
  data: [{ x: [1, 2, 3], y: [2, 5, 3], type: "scatter" }]
  layout: { width: 240, height: 180 }
  config: { staticPlot: true }
}

$plot | termplot --cli ${JSON.stringify(termplot)} --socket ${JSON.stringify(socket)} --ttl-ms 60000 --timeout-ms 60000 | save --force ${JSON.stringify(output)}
`,
);

try {
  await execFileAsync(nu, [script], { timeout: 90_000, maxBuffer: 20 * 1024 * 1024 });

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

function findCommand(command) {
  try {
    return execFileSync("sh", ["-lc", `command -v ${command}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}
