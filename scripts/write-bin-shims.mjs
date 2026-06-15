import { chmodSync, mkdirSync, writeFileSync } from "node:fs";

mkdirSync("build/bin", { recursive: true });

const shims = new Map([
  ["termplot.js", "../src/bin/termplot.js"],
  ["termplotd.js", "../src/bin/termplotd.js"],
]);

for (const [name, target] of shims) {
  const path = `build/bin/${name}`;
  writeFileSync(path, `#!/usr/bin/env node\nimport ${JSON.stringify(target)};\n`);
  chmodSync(path, 0o755);
}
