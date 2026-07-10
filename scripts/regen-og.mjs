#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profile = JSON.parse(readFileSync(join(root, "data/profile.json"), "utf8"));

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 72;

const palette = {
  bgTop: [12, 14, 24],
  bgBottom: [28, 18, 64],
  accent: [148, 96, 255],
  fg: [240, 240, 245],
  muted: [160, 160, 180],
  badgeBg: [60, 38, 120],
};

const shippingPath = join(root, "data/now-shipping.json");
const shipping = existsSync(shippingPath)
  ? JSON.parse(readFileSync(shippingPath, "utf8"))
  : { repos: [], generated_at: null };

const referenceDate = shipping.generated_at ? new Date(shipping.generated_at) : new Date();
const weekAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
const reposThisWeek = (shipping.repos ?? []).filter((r) => {
  if (!r.committed_at) return false;
  const t = new Date(r.committed_at).getTime();
  return t >= weekAgo.getTime() && t <= referenceDate.getTime();
});

const statusLine = (profile.status ?? "")
  .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
  .replace(/\*\*/g, "")
  .replace(/\s+/g, " ")
  .trim();

const stats = [
  `${reposThisWeek.length} repos shipped this week`,
  `${(shipping.repos ?? []).length} repos tracked`,
  `${(profile.selected_work ?? []).length} flagship projects`,
];

const FONT = buildFont();

function buildFont() {
  const data = {
    " ": [0, 0, 0, 0, 0, 0, 0],
    "!": [4, 4, 4, 4, 4, 0, 4],
    '"': [10, 10, 10, 0, 0, 0, 0],
    "#": [10, 31, 10, 31, 10, 0, 0],
    "%": [25, 26, 4, 11, 19, 0, 0],
    "&": [12, 18, 12, 21, 26, 0, 0],
    "'": [4, 4, 0, 0, 0, 0, 0],
    "(": [2, 4, 4, 4, 2, 0, 0],
    ")": [4, 2, 2, 2, 4, 0, 0],
    "*": [0, 10, 4, 10, 0, 0, 0],
    "+": [0, 4, 14, 4, 0, 0, 0],
    ",": [0, 0, 0, 0, 4, 4, 8],
    "-": [0, 0, 14, 0, 0, 0, 0],
    ".": [0, 0, 0, 0, 0, 4, 0],
    "/": [0, 1, 2, 4, 8, 16, 0],
    "0": [14, 17, 19, 21, 25, 17, 14],
    "1": [4, 12, 4, 4, 4, 4, 14],
    "2": [14, 17, 1, 6, 8, 16, 31],
    "3": [14, 17, 1, 6, 1, 17, 14],
    "4": [2, 6, 10, 18, 31, 2, 2],
    "5": [31, 16, 30, 1, 1, 17, 14],
    "6": [6, 8, 16, 30, 17, 17, 14],
    "7": [31, 1, 2, 4, 8, 8, 8],
    "8": [14, 17, 17, 14, 17, 17, 14],
    "9": [14, 17, 17, 15, 1, 2, 12],
    ":": [0, 4, 0, 0, 4, 0, 0],
    ";": [0, 4, 0, 0, 4, 4, 8],
    "?": [14, 17, 1, 2, 4, 0, 4],
    "@": [14, 17, 23, 21, 23, 16, 14],
    A: [14, 17, 17, 31, 17, 17, 17],
    B: [30, 17, 17, 30, 17, 17, 30],
    C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31],
    F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 14],
    H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12],
    K: [17, 18, 20, 24, 20, 18, 17],
    L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17],
    N: [17, 17, 25, 21, 19, 17, 17],
    O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13],
    R: [30, 17, 17, 30, 20, 18, 17],
    S: [14, 17, 16, 14, 1, 17, 14],
    T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4],
    W: [17, 17, 17, 21, 21, 21, 10],
    X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4],
    Z: [31, 1, 2, 4, 8, 16, 31],
    "[": [6, 4, 4, 4, 4, 4, 6],
    "]": [6, 2, 2, 2, 2, 2, 6],
    _: [0, 0, 0, 0, 0, 0, 31],
    a: [0, 0, 14, 1, 15, 17, 15],
    b: [16, 16, 22, 25, 17, 17, 30],
    c: [0, 0, 14, 16, 16, 17, 14],
    d: [1, 1, 13, 19, 17, 17, 15],
    e: [0, 0, 14, 17, 31, 16, 14],
    f: [6, 9, 8, 28, 8, 8, 8],
    g: [0, 0, 15, 17, 15, 1, 14],
    h: [16, 16, 22, 25, 17, 17, 17],
    i: [4, 0, 12, 4, 4, 4, 14],
    j: [2, 0, 6, 2, 2, 18, 12],
    k: [16, 16, 18, 20, 24, 20, 18],
    l: [12, 4, 4, 4, 4, 4, 14],
    m: [0, 0, 26, 21, 21, 17, 17],
    n: [0, 0, 22, 25, 17, 17, 17],
    o: [0, 0, 14, 17, 17, 17, 14],
    p: [0, 0, 30, 17, 30, 16, 16],
    q: [0, 0, 15, 17, 15, 1, 1],
    r: [0, 0, 22, 25, 16, 16, 16],
    s: [0, 0, 14, 16, 14, 1, 30],
    t: [8, 8, 28, 8, 8, 9, 6],
    u: [0, 0, 17, 17, 17, 19, 13],
    v: [0, 0, 17, 17, 17, 10, 4],
    w: [0, 0, 17, 17, 21, 21, 10],
    x: [0, 0, 17, 10, 4, 10, 17],
    y: [0, 0, 17, 17, 15, 1, 14],
    z: [0, 0, 31, 2, 4, 8, 31],
  };
  return data;
}

function makeBuffer() {
  const buf = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / (HEIGHT - 1);
    const r = Math.round(palette.bgTop[0] + (palette.bgBottom[0] - palette.bgTop[0]) * t);
    const g = Math.round(palette.bgTop[1] + (palette.bgBottom[1] - palette.bgTop[1]) * t);
    const b = Math.round(palette.bgTop[2] + (palette.bgBottom[2] - palette.bgTop[2]) * t);
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function setPixel(buf, x, y, [r, g, b], a = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 4;
  if (a === 255) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = 255;
    return;
  }
  const alpha = a / 255;
  buf[i] = Math.round(buf[i] * (1 - alpha) + r * alpha);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - alpha) + g * alpha);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - alpha) + b * alpha);
  buf[i + 3] = 255;
}

function fillRect(buf, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(buf, x, y, color);
    }
  }
}

function glyph(buf, ch, x0, y0, scale, color) {
  const rows = FONT[ch] ?? FONT["?"];
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < 5; rx++) {
      if ((row >> (4 - rx)) & 1) {
        fillRect(buf, x0 + rx * scale, y0 + ry * scale, scale, scale, color);
      }
    }
  }
}

function textWidth(text, scale, tracking = 1) {
  return text.length * (5 + tracking) * scale - tracking * scale;
}

function drawText(buf, text, x, y, scale, color, tracking = 1) {
  let cx = x;
  for (const ch of text) {
    glyph(buf, ch, cx, y, scale, color);
    cx += (5 + tracking) * scale;
  }
}

function buildPng(rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const off = y * (WIDTH * 4 + 1);
    raw[off] = 0;
    rgba.copy(raw, off + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }
  const idatData = deflateSync(raw, { level: 9 });

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  const crc32 = (data) => {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const buf = makeBuffer();

fillRect(buf, 0, 0, WIDTH, 12, palette.accent);
fillRect(buf, 0, HEIGHT - 12, WIDTH, 12, palette.accent);

// All text is sized and stacked against the profile data actually in play, so
// a longer name/tagline/status shrinks to fit instead of overflowing the
// canvas or colliding with the block below it (the bug this replaced: a
// hardcoded "wranngle" title/tagline frozen pre-identity-rename, and fixed Y
// offsets that assumed short content and ran the stats block into the footer).
const maxContentWidth = WIDTH - PADDING * 2;

function fitScale(text, maxScale, maxWidthPx, minScale = 2, tracking = 1) {
  for (let s = maxScale; s >= minScale; s--) {
    if (textWidth(text, s, tracking) <= maxWidthPx) return s;
  }
  return minScale;
}

let cursorY = PADDING;

const titleText = profile.name || "wranngle";
const titleScale = fitScale(titleText, 10, maxContentWidth, 6);
drawText(buf, titleText, PADDING, cursorY, titleScale, palette.fg);
cursorY += 7 * titleScale + 28;

const tagline = profile.tagline || "voice AI agents / workflow automation / full-stack TS";
const taglineScale = fitScale(tagline, 4, maxContentWidth, 2);
drawText(buf, tagline, PADDING, cursorY, taglineScale, palette.muted);
cursorY += 7 * taglineScale + 40;

const statusText = statusLine || "Status";
const badgePad = 24;
const badgeScale = fitScale(statusText, 5, maxContentWidth - badgePad * 2, 3);
const badgeTextWidth = textWidth(statusText, badgeScale);
const badgeW = badgeTextWidth + badgePad * 2;
const badgeH = 7 * badgeScale + badgePad * 2;
fillRect(buf, PADDING, cursorY, badgeW, badgeH, palette.badgeBg);
fillRect(buf, PADDING, cursorY, 8, badgeH, palette.accent);
drawText(buf, statusText, PADDING + badgePad, cursorY + badgePad, badgeScale, palette.fg);
cursorY += badgeH + 44;

const footer = "github.com/wranngle";
const footerScale = 4;
const footerY = HEIGHT - PADDING - 7 * footerScale;

const statsLabel = "This week";
drawText(buf, statsLabel, PADDING, cursorY, 4, palette.muted);
cursorY += 7 * 4 + 22;

// Fit the stats block into whatever vertical room remains above the footer
// instead of assuming a fixed line count/height fits — this is what let the
// "repos tracked" line run into the footer before.
const statsBudget = Math.max(0, footerY - 20 - cursorY);
const perLineBudget = stats.length > 0 ? statsBudget / stats.length : 0;
const statsLineScale = Math.max(3, Math.min(5, Math.floor((perLineBudget - 15) / 7)));
const statsStep = 7 * statsLineScale + 15;
for (const line of stats) {
  drawText(buf, line, PADDING, cursorY, statsLineScale, palette.fg);
  cursorY += statsStep;
}

drawText(buf, footer, PADDING, footerY, footerScale, palette.muted);

const png = buildPng(buf);
const outPath = join(root, "og.png");
writeFileSync(outPath, png);
console.log(`regen-og: wrote ${outPath} (${WIDTH}x${HEIGHT}, ${png.length} bytes)`);
