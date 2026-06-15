import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const nu = findCommand("nu");
const termplot = new URL("../bin/termplot.js", import.meta.url).pathname;
const termplotNu = join(process.cwd(), "termplot.nu");

function findCommand(command: string): string | undefined {
  try {
    return execFileSync("sh", ["-lc", `command -v ${command}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function pngDimensions(path: string): { width: number; height: number } {
  const png = fs.readFileSync(path);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test("Nushell wrapper renders pipeline values through the TermPlot daemon", { skip: !nu }, async () => {
  assert.ok(nu);
  const dir = await mkdtemp("/tmp/tp-nu-");
  const socket = join(dir, "termplotd.sock");
  const log = join(dir, "termplotd.log");
  const firstPng = join(dir, "first.png");
  const binaryPng = join(dir, "binary.png");
  const metaJson = join(dir, "meta.json");
  const script = join(dir, "run.nu");

  await writeFile(
    script,
    `
source ${JSON.stringify(termplotNu)}

let config = {
  data: [{ x: [1, 2, 3], y: [2, 5, 3], type: "scatter", mode: "lines+markers" }]
  layout: { width: 240, height: 180 }
  config: { staticPlot: true }
}

let first = ($config | termplot --cli ${JSON.stringify(termplot)} --socket ${JSON.stringify(socket)} --log ${JSON.stringify(log)} --ttl-ms 60000 --timeout-ms 60000 --output ${JSON.stringify(firstPng)})
$config | termplot --cli ${JSON.stringify(termplot)} --socket ${JSON.stringify(socket)} --log ${JSON.stringify(log)} --ttl-ms 60000 --timeout-ms 60000 | save --force ${JSON.stringify(binaryPng)}
let status = (^${JSON.stringify(termplot)} daemon status --socket ${JSON.stringify(socket)} | from json)
{ first: $first, status: $status, nu_version: (version | get version) } | to json --raw | save --force ${JSON.stringify(metaJson)}
`,
  );

  try {
    await execFileAsync(nu, [script], {
      timeout: 90_000,
      maxBuffer: 20 * 1024 * 1024,
    });

    assert.deepEqual(pngDimensions(firstPng), { width: 240, height: 180 });
    assert.deepEqual(pngDimensions(binaryPng), { width: 240, height: 180 });

    const metadata = JSON.parse(fs.readFileSync(metaJson, "utf8"));
    assert.equal(metadata.first.ok, true);
    assert.equal(metadata.first.daemonPid, metadata.status.status.pid);
    assert.equal(typeof metadata.nu_version, "string");
    assert.match(metadata.first.plotId, /^[0-9a-f-]{36}$/);
  } finally {
    await execFileAsync(process.execPath, [termplot, "daemon", "stop", "--socket", socket], {
      timeout: 5_000,
    }).catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  }
});
