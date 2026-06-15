import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");

test("package metadata exposes TermPlot v1 artifacts", () => {
  assert.equal(pkg.name, "termplot");
  assert.equal(pkg.bin.termplot, "./build/bin/termplot.js");
  assert.equal(pkg.bin.termplotd, "./build/bin/termplotd.js");
  assert.equal(pkg.scripts["playwright:install"], "playwright install firefox");
  assert.equal(pkg.scripts["playwright:verify"], "node scripts/verify-playwright-firefox.mjs");
  assert.equal(pkg.scripts["smoke"], "pnpm run playwright:verify && pnpm run smoke:shell && pnpm run smoke:nu");

  for (const path of ["README.md", "LICENSE", "NOTICE", "termplot.nu", "build/bin", "build/src"]) {
    assert.ok(pkg.files.includes(path), `${path} should be packaged`);
  }
});

test("README covers setup, shell, Nushell, protocols, and lifecycle", () => {
  for (const phrase of [
    "pnpm run playwright:install",
    "pnpm run playwright:verify",
    "node build/bin/termplot.js render",
    "source termplot.nu",
    "--protocol kitty",
    "--protocol iterm2",
    "daemon status",
    "daemon stop",
    "pnpm run smoke",
  ]) {
    assert.ok(readme.includes(phrase), `README should mention ${phrase}`);
  }
});
