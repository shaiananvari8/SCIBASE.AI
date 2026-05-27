const fs = require("node:fs");
const path = require("node:path");
const { evaluateChallengeReviewerWorkload } = require("./index");
const { riskyChallenge } = require("./sample-data");

const WIDTH = 480;
const HEIGHT = 270;
const FPS = 2;
const SLIDE_SECONDS = 2;
const BG = [246, 248, 244];
const INK = [25, 42, 47];
const MUTED = [76, 92, 97];
const RED = [217, 79, 69];
const AMBER = [201, 150, 47];
const GREEN = [47, 143, 104];
const LINE = [184, 197, 194];
const WHITE = [255, 255, 255];

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11110", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

function setPixel(frame, x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
    return;
  }
  const offset = (y * WIDTH + x) * 3;
  frame[offset] = color[0];
  frame[offset + 1] = color[1];
  frame[offset + 2] = color[2];
}

function rect(frame, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setPixel(frame, col, row, color);
    }
  }
}

function text(frame, value, x, y, scale, color) {
  const chars = String(value).toUpperCase();
  let cursor = x;
  for (const char of chars) {
    const glyph = FONT[char] || FONT[" "];
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] === "1") {
          rect(frame, cursor + gx * scale, y + gy * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function baseFrame() {
  const frame = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let i = 0; i < frame.length; i += 3) {
    frame[i] = BG[0];
    frame[i + 1] = BG[1];
    frame[i + 2] = BG[2];
  }
  rect(frame, 14, 14, WIDTH - 28, HEIGHT - 28, WHITE);
  rect(frame, 14, 14, WIDTH - 28, 2, LINE);
  rect(frame, 14, HEIGHT - 16, WIDTH - 28, 2, LINE);
  rect(frame, 14, 14, 2, HEIGHT - 28, LINE);
  rect(frame, WIDTH - 16, 14, 2, HEIGHT - 28, LINE);
  return frame;
}

function bar(frame, x, y, width, label, value, color) {
  text(frame, label, x, y, 2, MUTED);
  rect(frame, x, y + 20, 270, 12, [217, 226, 228]);
  rect(frame, x, y + 20, Math.max(5, Math.round(270 * value)), 12, color);
  text(frame, `${Math.round(value * 100)}%`, x + 285, y + 15, 2, INK);
}

function makeSlides(result) {
  const loadRows = result.reviewerStates.slice(0, 4);
  const slides = [];

  let frame = baseFrame();
  text(frame, "REVIEWER SLA GUARD", 36, 45, 3, INK);
  text(frame, "SCIENTIFIC BOUNTY SYSTEM", 38, 78, 2, MUTED);
  text(frame, result.summary.status, 38, 126, 3, RED);
  text(frame, `${result.summary.blockers} BLOCKERS`, 38, 168, 2, RED);
  text(frame, `${result.summary.warnings} WARNINGS`, 38, 194, 2, AMBER);
  slides.push(frame);

  frame = baseFrame();
  text(frame, "REVIEWER LOAD", 36, 44, 3, INK);
  loadRows.forEach((reviewer, index) => {
    const color = reviewer.isUnavailable || reviewer.isOverloaded ? RED : reviewer.utilization >= 0.75 ? AMBER : GREEN;
    bar(frame, 40, 86 + index * 40, 270, reviewer.displayName, Math.min(1, reviewer.utilization), color);
  });
  slides.push(frame);

  frame = baseFrame();
  text(frame, "RUBRIC COVERAGE", 36, 44, 3, INK);
  result.criterionCoverage.forEach((criterion, index) => {
    const ok = criterion.hasEnoughCoverage;
    const y = 92 + index * 44;
    text(frame, criterion.label, 40, y, 2, INK);
    text(frame, `${criterion.eligibleReviewers.length}/${criterion.minReviewers}`, 350, y, 2, ok ? GREEN : RED);
  });
  slides.push(frame);

  frame = baseFrame();
  text(frame, "STALE REVIEWS", 36, 44, 3, INK);
  result.blockers
    .filter((blocker) => blocker.code === "critical_stale_review")
    .slice(0, 3)
    .forEach((blocker, index) => {
      text(frame, blocker.evidence.assignmentId, 42, 92 + index * 45, 2, INK);
      text(frame, `${blocker.evidence.hoursLate} H LATE`, 42, 116 + index * 45, 2, RED);
    });
  text(frame, "AWARD RELEASE HELD", 42, 218, 2, RED);
  slides.push(frame);

  frame = baseFrame();
  text(frame, "ESCALATION", 36, 44, 3, INK);
  result.escalationPlan.slice(0, 4).forEach((action, index) => {
    text(frame, action.priority, 42, 90 + index * 36, 2, action.priority === "critical" ? RED : AMBER);
    text(frame, action.owner, 160, 90 + index * 36, 2, INK);
  });
  text(frame, "REASSIGN BEFORE SCORING", 42, 226, 2, MUTED);
  slides.push(frame);

  frame = baseFrame();
  text(frame, "REVIEW ARTIFACTS", 36, 44, 3, INK);
  text(frame, "JSON PACKET", 42, 96, 2, GREEN);
  text(frame, "MARKDOWN REPORT", 42, 128, 2, GREEN);
  text(frame, "SVG SUMMARY", 42, 160, 2, GREEN);
  text(frame, "DEMO VIDEO", 42, 192, 2, GREEN);
  text(frame, result.auditDigest.slice(0, 20), 42, 230, 2, MUTED);
  slides.push(frame);

  const frames = [];
  for (const slide of slides) {
    for (let i = 0; i < FPS * SLIDE_SECONDS; i += 1) {
      frames.push(slide);
    }
  }
  return frames;
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function writeInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value, 0);
  return buffer;
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function chunk(id, payload) {
  const pad = payload.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([Buffer.from(id, "ascii"), writeUInt32(payload.length), payload, pad]);
}

function list(type, payload) {
  return chunk("LIST", Buffer.concat([Buffer.from(type, "ascii"), payload]));
}

function rgbToBgrBottomUp(frame) {
  const stride = Math.ceil((WIDTH * 3) / 4) * 4;
  const out = Buffer.alloc(stride * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const sourceY = HEIGHT - 1 - y;
    for (let x = 0; x < WIDTH; x += 1) {
      const source = (sourceY * WIDTH + x) * 3;
      const target = y * stride + x * 3;
      out[target] = frame[source + 2];
      out[target + 1] = frame[source + 1];
      out[target + 2] = frame[source];
    }
  }
  return out;
}

function avi(frames) {
  const framePayloads = frames.map(rgbToBgrBottomUp);
  const frameSize = framePayloads[0].length;
  const avih = Buffer.concat([
    writeUInt32(Math.round(1000000 / FPS)),
    writeUInt32(frameSize * FPS),
    writeUInt32(0),
    writeUInt32(0x10),
    writeUInt32(frames.length),
    writeUInt32(0),
    writeUInt32(1),
    writeUInt32(frameSize),
    writeUInt32(WIDTH),
    writeUInt32(HEIGHT),
    writeUInt32(0),
    writeUInt32(0),
    writeUInt32(0),
    writeUInt32(0)
  ]);
  const strh = Buffer.concat([
    Buffer.from("vids", "ascii"),
    Buffer.from("DIB ", "ascii"),
    writeUInt32(0),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt32(0),
    writeUInt32(1),
    writeUInt32(FPS),
    writeUInt32(0),
    writeUInt32(frames.length),
    writeUInt32(frameSize),
    writeUInt32(0xffffffff),
    writeUInt32(0),
    writeInt32(0),
    writeInt32(0),
    writeInt32(WIDTH),
    writeInt32(HEIGHT)
  ]);
  const strf = Buffer.concat([
    writeUInt32(40),
    writeInt32(WIDTH),
    writeInt32(HEIGHT),
    writeUInt16(1),
    writeUInt16(24),
    writeUInt32(0),
    writeUInt32(frameSize),
    writeInt32(2835),
    writeInt32(2835),
    writeUInt32(0),
    writeUInt32(0)
  ]);
  const hdrl = list("hdrl", Buffer.concat([chunk("avih", avih), list("strl", Buffer.concat([chunk("strh", strh), chunk("strf", strf)]))]));

  let offset = 4;
  const idxEntries = [];
  const frameChunks = [];
  for (const payload of framePayloads) {
    const frameChunk = chunk("00db", payload);
    frameChunks.push(frameChunk);
    idxEntries.push(Buffer.concat([Buffer.from("00db", "ascii"), writeUInt32(0x10), writeUInt32(offset), writeUInt32(payload.length)]));
    offset += frameChunk.length;
  }
  const movi = list("movi", Buffer.concat(frameChunks));
  const idx1 = chunk("idx1", Buffer.concat(idxEntries));
  const body = Buffer.concat([Buffer.from("AVI ", "ascii"), hdrl, movi, idx1]);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), writeUInt32(body.length), body]);
}

function main() {
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const result = evaluateChallengeReviewerWorkload(riskyChallenge);
  const video = avi(makeSlides(result));
  const target = path.join(reportsDir, "demo.avi");
  fs.writeFileSync(target, video);
  console.log(`generated ${path.relative(process.cwd(), target)} (${video.length} bytes)`);
}

main();
