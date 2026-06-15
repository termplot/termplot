#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const zlib = require("node:zlib");

const ESC = "\x1b";
const BEL = "\x07";
const width = 64;
const height = 64;
const columns = 16;

function parseArgs(argv) {
  const args = {
    capture: undefined,
    png: undefined,
  };

  for (const arg of argv) {
    if (arg.startsWith("--capture=")) {
      args.capture = arg.slice("--capture=".length);
    } else if (arg.startsWith("--png=")) {
      args.png = arg.slice("--png=".length);
    } else if (arg === "--help") {
      process.stdout.write("usage: node-iterm2-osc1337-direct.js [--capture=<path>] [--png=<path>]\n");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function makeRgbaImage() {
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (x < width / 2 && y < height / 2) {
        rgba[offset] = 255;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
      } else if (x >= width / 2 && y < height / 2) {
        rgba[offset] = 0;
        rgba[offset + 1] = 255;
        rgba[offset + 2] = 0;
      } else if (x < width / 2) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 255;
      } else {
        rgba[offset] = 255;
        rgba[offset + 1] = 255;
        rgba[offset + 2] = 255;
      }
      rgba[offset + 3] = 255;
    }
  }

  return rgba;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(8 + data.length + 4);

  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);

  return chunk;
}

function makePng(rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * (stride + 1);
    scanlines[scanlineOffset] = 0;
    rgba.copy(scanlines, scanlineOffset + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(scanlines)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeOsc1337Output(png) {
  const encoded = png.toString("base64");
  const header = `${ESC}]1337;File=name=dGVybXBsb3QtaXRlcm0yLXByb29mLnBuZw==;size=${png.length};inline=1;width=${columns};preserveAspectRatio=1:`;
  return Buffer.from(`${header}${encoded}${BEL}\n`, "binary");
}

function assertOsc1337Output(output) {
  const text = output.toString("binary");

  if (!text.includes(`${ESC}]1337;File=`)) {
    throw new Error("output does not contain iTerm2 OSC 1337 File= sequence");
  }

  if (!text.includes("inline=1")) {
    throw new Error("output does not contain inline=1");
  }

  if (text.includes(`${ESC}_G`)) {
    throw new Error("output unexpectedly contains Kitty APC data");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const png = makePng(makeRgbaImage());
  const output = makeOsc1337Output(png);

  assertOsc1337Output(output);

  if (args.png) {
    fs.writeFileSync(args.png, png);
  }

  if (args.capture) {
    fs.writeFileSync(args.capture, output);
  }

  fs.writeSync(process.stdout.fd, output);
  process.stderr.write("node_iterm2_fixture=direct\n");
  process.stderr.write("node_iterm2_protocol=osc1337\n");
  process.stderr.write(`node_iterm2_png_size=${width}x${height}\n`);
  process.stderr.write(`node_iterm2_png_bytes=${png.length}\n`);
  process.stderr.write(`node_iterm2_output_bytes=${output.length}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
}
