import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeIterm2Png,
  encodeKittyPng,
  resolveTerminalProtocol,
} from "../src/display/protocols.js";

const png = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
]);

test("Kitty encoder emits APC chunks without OSC 1337 bytes", () => {
  const output = encodeKittyPng(Buffer.alloc(5000, 7));
  const text = output.toString("binary");

  assert.match(text, /^\x1b_Ga=T,f=100,q=2,m=1;/);
  assert.match(text, /\x1b_Gq=2,m=0;/);
  assert.match(text, /\x1b\\\n$/);
  assert.equal(text.includes("\x1b]1337;File="), false);
});

test("iTerm2 encoder emits OSC 1337 inline image without Kitty bytes", () => {
  const output = encodeIterm2Png(png, "plot.png");
  const text = output.toString("binary");

  assert.match(text, /^\x1b]1337;File=/);
  assert.match(text, /name=cGxvdC5wbmc=/);
  assert.match(text, /size=16/);
  assert.match(text, /inline=1/);
  assert.match(text, /\x07\n$/);
  assert.equal(text.includes("\x1b_G"), false);
});

test("auto protocol detection is conservative", () => {
  assert.equal(resolveTerminalProtocol("auto", { TERM_PROGRAM: "ghostty" }), "kitty");
  assert.equal(resolveTerminalProtocol("auto", { GHOSTTY_RESOURCES_DIR: "/tmp/ghostty" }), "kitty");
  assert.equal(resolveTerminalProtocol("auto", { TERM_PROGRAM: "iTerm.app" }), "iterm2");
  assert.equal(resolveTerminalProtocol("auto", { ITERM_SESSION_ID: "w0t0p0" }), "iterm2");
  assert.equal(resolveTerminalProtocol("kitty", {}), "kitty");
  assert.equal(resolveTerminalProtocol("iterm2", {}), "iterm2");
  assert.throws(() => resolveTerminalProtocol("auto", {}), { name: "DisplayError", code: "UNSUPPORTED_TERMINAL" });
  assert.throws(() => resolveTerminalProtocol("sixel", {}), { name: "DisplayError", code: "PROTOCOL_NOT_IMPLEMENTED" });
});
