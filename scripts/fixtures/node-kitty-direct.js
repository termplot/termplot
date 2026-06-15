#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const ESC = "\x1b";
const width = 64;
const height = 64;
const columns = 16;
const rows = 16;
const chunkSize = 4096;

function parseArgs(argv) {
  const args = {
    capture: undefined,
  };

  for (const arg of argv) {
    if (arg.startsWith("--capture=")) {
      args.capture = arg.slice("--capture=".length);
    } else if (arg === "--help") {
      process.stdout.write("usage: node-kitty-direct.js [--capture=<path>]\n");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function makeRgbImage() {
  const rgb = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      if (x < width / 2 && y < height / 2) {
        rgb[offset] = 255;
        rgb[offset + 1] = 0;
        rgb[offset + 2] = 0;
      } else if (x >= width / 2 && y < height / 2) {
        rgb[offset] = 0;
        rgb[offset + 1] = 255;
        rgb[offset + 2] = 0;
      } else if (x < width / 2) {
        rgb[offset] = 0;
        rgb[offset + 1] = 0;
        rgb[offset + 2] = 255;
      } else {
        rgb[offset] = 255;
        rgb[offset + 1] = 255;
        rgb[offset + 2] = 255;
      }
    }
  }

  return rgb;
}

function makeKittyOutput(rgb) {
  const encoded = rgb.toString("base64");
  const chunks = [];

  for (let start = 0; start < encoded.length; start += chunkSize) {
    chunks.push(encoded.slice(start, start + chunkSize));
  }

  return Buffer.concat(
    chunks.map((chunk, index) => {
      const isFirst = index === 0;
      const isLast = index === chunks.length - 1;
      const metadata = isFirst
        ? `a=T,f=24,s=${width},v=${height},c=${columns},r=${rows},q=2,m=${isLast ? 0 : 1}`
        : `q=2,m=${isLast ? 0 : 1}`;

      return Buffer.from(`${ESC}_G${metadata};${chunk}${ESC}\\`, "binary");
    }).concat(Buffer.from("\n", "binary")),
  );
}

function assertKittyOutput(output) {
  const text = output.toString("binary");

  if (!text.includes(`${ESC}_G`)) {
    throw new Error("output does not contain Kitty APC ESC_G sequence");
  }

  if (!text.includes(`${ESC}\\`)) {
    throw new Error("output does not contain Kitty APC string terminator");
  }

  if (text.includes("File=")) {
    throw new Error("output unexpectedly contains iTerm2 OSC 1337 File= data");
  }

  if (!text.includes("f=24") || !text.includes(`s=${width}`) || !text.includes(`v=${height}`)) {
    throw new Error("output is missing expected raw RGB Kitty metadata");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rgb = makeRgbImage();
  const output = makeKittyOutput(rgb);

  assertKittyOutput(output);

  if (args.capture) {
    fs.writeFileSync(args.capture, output);
  }

  fs.writeSync(process.stdout.fd, output);
  process.stderr.write(`node_kitty_fixture=direct\n`);
  process.stderr.write(`node_kitty_protocol=kitty\n`);
  process.stderr.write(`node_kitty_format=rgb24\n`);
  process.stderr.write(`node_kitty_size=${width}x${height}\n`);
  process.stderr.write(`node_kitty_cells=${columns}x${rows}\n`);
  process.stderr.write(`node_kitty_bytes=${output.length}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
}
