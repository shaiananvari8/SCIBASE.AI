"use strict";

const fs = require("fs");
const path = require("path");

const width = 320;
const height = 180;
const fps = 2;
const frameCount = 16;
const rowSize = Math.ceil((width * 3) / 4) * 4;
const frameSize = rowSize * height;
const reportsDir = path.join(__dirname, "reports");
const outputPath = path.join(reportsDir, "demo.avi");

fs.mkdirSync(reportsDir, { recursive: true });

const frames = [];
for (let i = 0; i < frameCount; i += 1) {
  frames.push(makeFrame(i));
}

const chunks = [];
const indexes = [];
let offset = 4;
for (const frame of frames) {
  const chunk = riffChunk("00db", frame);
  chunks.push(chunk);
  indexes.push(indexEntry("00db", 0x10, offset, frame.length));
  offset += chunk.length;
}

const hdrl = listChunk("hdrl", [
  riffChunk("avih", aviHeader()),
  listChunk("strl", [
    riffChunk("strh", streamHeader()),
    riffChunk("strf", bitmapInfoHeader())
  ])
]);
const movi = listChunk("movi", chunks);
const idx1 = riffChunk("idx1", Buffer.concat(indexes));
const riff = riffChunk("RIFF", Buffer.concat([Buffer.from("AVI "), hdrl, movi, idx1]));

fs.writeFileSync(outputPath, riff);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)} (${riff.length} bytes)`);

function makeFrame(frameIndex) {
  const frame = Buffer.alloc(frameSize, 0xff);
  const progress = (frameIndex + 1) / frameCount;
  fillRect(frame, 0, 0, width, height, [248, 250, 252]);
  fillRect(frame, 18, 18, 284, 144, [255, 255, 255]);
  strokeRect(frame, 18, 18, 284, 144, [210, 218, 228]);
  fillRect(frame, 38, 50, 240, 18, [232, 237, 244]);
  fillRect(frame, 38, 50, Math.round(240 * progress), 18, [185, 28, 28]);
  fillRect(frame, 38, 90, 240, 18, [232, 237, 244]);
  fillRect(frame, 38, 90, Math.round(120 * progress), 18, [183, 121, 31]);
  fillRect(frame, 38, 130, 240, 18, [232, 237, 244]);
  fillRect(frame, 38, 130, Math.round(120 * progress), 18, [21, 128, 61]);
  drawTagMarks(frame, frameIndex);
  return frame;
}

function drawTagMarks(frame, frameIndex) {
  const count = Math.min(4, Math.floor(frameIndex / 4) + 1);
  for (let i = 0; i < count; i += 1) {
    fillRect(frame, 48 + i * 28, 78, 18, 8, [36, 78, 96]);
    fillRect(frame, 48 + i * 28, 88, 18, 4, [94, 129, 143]);
  }
}

function fillRect(frame, x, y, w, h, rgb) {
  for (let py = y; py < y + h; py += 1) {
    if (py < 0 || py >= height) continue;
    for (let px = x; px < x + w; px += 1) {
      if (px < 0 || px >= width) continue;
      setPixel(frame, px, py, rgb);
    }
  }
}

function strokeRect(frame, x, y, w, h, rgb) {
  fillRect(frame, x, y, w, 1, rgb);
  fillRect(frame, x, y + h - 1, w, 1, rgb);
  fillRect(frame, x, y, 1, h, rgb);
  fillRect(frame, x + w - 1, y, 1, h, rgb);
}

function setPixel(frame, x, y, rgb) {
  const bottomUpY = height - y - 1;
  const index = bottomUpY * rowSize + x * 3;
  frame[index] = rgb[2];
  frame[index + 1] = rgb[1];
  frame[index + 2] = rgb[0];
}

function aviHeader() {
  const buffer = Buffer.alloc(56);
  buffer.writeUInt32LE(Math.round(1000000 / fps), 0);
  buffer.writeUInt32LE(frameSize * fps, 4);
  buffer.writeUInt32LE(0, 8);
  buffer.writeUInt32LE(0x10, 12);
  buffer.writeUInt32LE(frameCount, 16);
  buffer.writeUInt32LE(0, 20);
  buffer.writeUInt32LE(1, 24);
  buffer.writeUInt32LE(frameSize, 28);
  buffer.writeUInt32LE(width, 32);
  buffer.writeUInt32LE(height, 36);
  return buffer;
}

function streamHeader() {
  const buffer = Buffer.alloc(56);
  buffer.write("vids", 0, 4, "ascii");
  buffer.write("DIB ", 4, 4, "ascii");
  buffer.writeUInt32LE(0, 8);
  buffer.writeUInt32LE(0, 12);
  buffer.writeUInt32LE(0, 16);
  buffer.writeUInt32LE(1, 20);
  buffer.writeUInt32LE(fps, 24);
  buffer.writeUInt32LE(0, 28);
  buffer.writeUInt32LE(frameCount, 32);
  buffer.writeUInt32LE(frameSize, 36);
  buffer.writeInt32LE(-1, 40);
  buffer.writeUInt32LE(0, 44);
  buffer.writeInt16LE(0, 48);
  buffer.writeInt16LE(0, 50);
  buffer.writeInt16LE(width, 52);
  buffer.writeInt16LE(height, 54);
  return buffer;
}

function bitmapInfoHeader() {
  const buffer = Buffer.alloc(40);
  buffer.writeUInt32LE(40, 0);
  buffer.writeInt32LE(width, 4);
  buffer.writeInt32LE(height, 8);
  buffer.writeUInt16LE(1, 12);
  buffer.writeUInt16LE(24, 14);
  buffer.writeUInt32LE(0, 16);
  buffer.writeUInt32LE(frameSize, 20);
  return buffer;
}

function indexEntry(id, flags, chunkOffset, size) {
  const buffer = Buffer.alloc(16);
  buffer.write(id, 0, 4, "ascii");
  buffer.writeUInt32LE(flags, 4);
  buffer.writeUInt32LE(chunkOffset, 8);
  buffer.writeUInt32LE(size, 12);
  return buffer;
}

function riffChunk(id, payload) {
  const size = payload.length;
  const pad = size % 2 === 1 ? 1 : 0;
  const buffer = Buffer.alloc(8 + size + pad);
  buffer.write(id, 0, 4, "ascii");
  buffer.writeUInt32LE(size, 4);
  payload.copy(buffer, 8);
  return buffer;
}

function listChunk(type, chunks) {
  return riffChunk("LIST", Buffer.concat([Buffer.from(type, "ascii"), ...chunks]));
}
