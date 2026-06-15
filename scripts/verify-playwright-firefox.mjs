import assert from "node:assert/strict";
import fs from "node:fs";
import { firefox } from "playwright";

const output = "/tmp/tp-playwright-firefox.png";
const browser = await firefox.launch({ headless: true, timeout: 60_000 });

try {
  const page = await browser.newPage({ viewport: { width: 200, height: 100 } });
  await page.setContent("<html><body><h1>TermPlot</h1></body></html>");
  const png = Buffer.from(await page.screenshot({ type: "png" }));
  fs.writeFileSync(output, png);

  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 200);
  assert.equal(png.readUInt32BE(20), 100);

  console.log(JSON.stringify({ ok: true, output, width: 200, height: 100 }));
} finally {
  await browser.close();
}
