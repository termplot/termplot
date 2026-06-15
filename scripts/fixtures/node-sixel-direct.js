#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const ESC = "\x1b";
const ST = `${ESC}\\`;
const width = 64;
const height = 64;

const colors = [
  { name: "red", rgb: [255, 0, 0], sixel: [100, 0, 0] },
  { name: "green", rgb: [0, 255, 0], sixel: [0, 100, 0] },
  { name: "blue", rgb: [0, 0, 255], sixel: [0, 0, 100] },
  { name: "white", rgb: [255, 255, 255], sixel: [100, 100, 100] },
];

function parseArgs(argv) {
  const args = { capture: undefined };

  for (const arg of argv) {
    if (arg.startsWith("--capture=")) {
      args.capture = arg.slice("--capture=".length);
    } else if (arg === "--help") {
      process.stdout.write("usage: node-sixel-direct.js [--capture=<path>]\n");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function colorAt(x, y) {
  if (x < width / 2 && y < height / 2) {
    return 0;
  }
  if (x >= width / 2 && y < height / 2) {
    return 1;
  }
  if (x < width / 2) {
    return 2;
  }
  return 3;
}

function makeSixelOutput() {
  const parts = [`${ESC}Pq"1;1;${width};${height}`];

  colors.forEach((color, index) => {
    const [r, g, b] = color.sixel;
    parts.push(`#${index + 1};2;${r};${g};${b}`);
  });

  for (let y = 0; y < height; y += 6) {
    colors.forEach((_, colorIndex) => {
      parts.push(`#${colorIndex + 1}`);
      for (let x = 0; x < width; x += 1) {
        let bits = 0;
        for (let bit = 0; bit < 6; bit += 1) {
          const py = y + bit;
          if (py < height && colorAt(x, py) === colorIndex) {
            bits |= 1 << bit;
          }
        }
        parts.push(String.fromCharCode(63 + bits));
      }
      if (colorIndex !== colors.length - 1) {
        parts.push("$");
      }
    });
    if (y + 6 < height) {
      parts.push("-");
    }
  }

  parts.push(ST, "\n");
  return Buffer.from(parts.join(""), "binary");
}

function assertSixelOutput(output) {
  const text = output.toString("binary");

  if (!text.startsWith(`${ESC}Pq`)) {
    throw new Error("output does not start with SIXEL DCS");
  }
  if (!text.includes('"1;1;64;64')) {
    throw new Error("output does not contain expected SIXEL raster attributes");
  }
  if (!text.endsWith(`${ST}\n`)) {
    throw new Error("output does not end with SIXEL ST terminator");
  }
  if (text.includes(`${ESC}_G`)) {
    throw new Error("output unexpectedly contains Kitty APC data");
  }
  if (text.includes(`${ESC}]1337;File=`)) {
    throw new Error("output unexpectedly contains iTerm2 OSC 1337 File= data");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const output = makeSixelOutput();
  assertSixelOutput(output);

  if (args.capture) {
    fs.writeFileSync(args.capture, output);
  }

  fs.writeSync(process.stdout.fd, output);
  process.stderr.write("node_sixel_fixture=direct\n");
  process.stderr.write("node_sixel_protocol=sixel\n");
  process.stderr.write(`node_sixel_size=${width}x${height}\n`);
  process.stderr.write(`node_sixel_output_bytes=${output.length}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
}
