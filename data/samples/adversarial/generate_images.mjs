/**
 * generate_images.mjs
 * Generates 4 adversarial test PNG files using only Node.js built-ins (zlib).
 * No external deps required.
 *
 * Output:
 *   tilted_bill.jpg        (actually a PNG, .jpg extension — harness reads by filename)
 *   blurred_bill.jpg
 *   weird_table_bill.jpg
 *   mixed_language_bill.jpg
 *
 * Usage:  node generate_images.mjs
 */

import zlib from "zlib";
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── PNG encoder ───────────────────────────────────────────────────────────────
// Each pixel = [R, G, B] (3 bytes). Width × Height grid.

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function encodePNG(pixels, width, height) {
  // Build raw scanlines: filter byte (0) + RGB pixels
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixels[y][x];
      const off = y * (1 + width * 3) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // colour type = RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), // PNG sig
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── 5×7 pixel font (digits + letters) ────────────────────────────────────────
// Each char is a 5-wide × 7-tall bitmap stored as 7 rows of 5 bits.
const FONT = {
  " ": [0,0,0,0,0,0,0],
  "0": [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
  "1": [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  "2": [0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
  "3": [0b11111,0b00010,0b00100,0b00110,0b00001,0b10001,0b01110],
  "4": [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  "5": [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  "6": [0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
  "7": [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  "8": [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  "9": [0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
  "A": [0b00100,0b01010,0b10001,0b11111,0b10001,0b10001,0b10001],
  "B": [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  "C": [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  "D": [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
  "E": [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  "F": [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  "G": [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01111],
  "H": [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  "I": [0b01110,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
  "L": [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  "M": [0b10001,0b11011,0b10101,0b10001,0b10001,0b10001,0b10001],
  "N": [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  "O": [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  "P": [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  "R": [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  "S": [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  "T": [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  "U": [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  "X": [0b10001,0b01010,0b00100,0b00100,0b00100,0b01010,0b10001],
  "Y": [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  "/": [0b00001,0b00010,0b00100,0b01000,0b10000,0b00000,0b00000],
  ":": [0b00000,0b00100,0b00000,0b00000,0b00100,0b00000,0b00000],
  ".": [0b00000,0b00000,0b00000,0b00000,0b00000,0b00100,0b00000],
  ",": [0b00000,0b00000,0b00000,0b00000,0b00100,0b00100,0b01000],
  "-": [0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000],
  "=": [0b00000,0b11111,0b00000,0b11111,0b00000,0b00000,0b00000],
  "\u20B9": [0b11110,0b10001,0b11110,0b10100,0b10010,0b10001,0b00000], // ₹
};

function drawChar(pixels, ch, px, py, fg = [0,0,0], scale = 2) {
  const rows = FONT[ch.toUpperCase()] ?? FONT[" "];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (rows[row] & (1 << (4 - col))) {
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) {
            const ry = py + row * scale + sy;
            const rx = px + col * scale + sx;
            if (ry < pixels.length && rx < pixels[0].length)
              pixels[ry][rx] = fg;
          }
      }
    }
  }
}

function drawText(pixels, text, px, py, fg = [0,0,0], scale = 2) {
  let x = px;
  for (const ch of text) {
    drawChar(pixels, ch, x, py, fg, scale);
    x += (5 + 1) * scale;
  }
}

function fillRect(pixels, x, y, w, h, color) {
  for (let row = y; row < Math.min(y + h, pixels.length); row++)
    for (let col = x; col < Math.min(x + w, pixels[0].length); col++)
      pixels[row][col] = color;
}

function makePixels(w, h, bg = [255,255,255]) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => [...bg]));
}

// ── Image 1: tilted_bill.jpg — sheared/rotated bill ───────────────────────────
// Simulate ~15° tilt by shearing pixel rows horizontally

{
  const W = 400, H = 520;
  const px = makePixels(W, H);

  // Draw normal bill content first on a temp canvas
  const tmp = makePixels(W, H);
  fillRect(tmp, 10, 10, W-20, H-20, [255,255,255]);
  // Border
  for (let i = 10; i < W-10; i++) { tmp[10][i] = [0,0,0]; tmp[H-10][i] = [0,0,0]; }
  for (let i = 10; i < H-10; i++) { tmp[i][10] = [0,0,0]; tmp[i][W-10] = [0,0,0]; }

  drawText(tmp, "HOSPITAL BILL",       20, 20,  [0,0,128], 2);
  drawText(tmp, "PATIENT: RAJESH",     20, 55,  [0,0,0],   2);
  drawText(tmp, "DATE: 08/08/2026",    20, 80,  [0,0,0],   2);
  fillRect(tmp, 10, 100, W-20, 2, [0,0,0]);
  drawText(tmp, "ITEM",                20, 110, [0,0,0],   2);
  drawText(tmp, "RATE",               200, 110, [0,0,0],   2);
  drawText(tmp, "AMT",                320, 110, [0,0,0],   2);
  fillRect(tmp, 10, 130, W-20, 1, [180,180,180]);
  drawText(tmp, "CROCIN TAB",          20, 140, [0,0,0],   2);
  drawText(tmp, "12.00",              200, 140, [0,0,0],   2);
  drawText(tmp, "120",                320, 140, [0,0,0],   2);
  drawText(tmp, "XRAY SCAN",          20, 170, [0,0,0],   2);
  drawText(tmp, "450.00",            200, 170, [0,0,0],   2);
  drawText(tmp, "450",               320, 170, [0,0,0],   2);
  drawText(tmp, "BED CHARGES/DAY",    20, 200, [0,0,0],   2);
  drawText(tmp, "800.00",            200, 200, [0,0,0],   2);
  drawText(tmp, "2400",              320, 200, [0,0,0],   2);
  fillRect(tmp, 10, 230, W-20, 2, [0,0,0]);
  drawText(tmp, "TOTAL AMT",          20, 240, [0,0,128], 2);
  drawText(tmp, "2970",              320, 240, [0,0,128], 2);

  // Apply shear to simulate ~15° tilt
  const SHEAR = 0.27; // tan(15°)
  for (let y = 0; y < H; y++) {
    const shift = Math.round((H - y) * SHEAR * 0.25);
    for (let x = 0; x < W; x++) {
      const sx = x - shift;
      px[y][x] = (sx >= 0 && sx < W) ? tmp[y][sx] : [240,240,240];
    }
  }

  fs.writeFileSync(path.join(__dirname, "tilted_bill.jpg"), encodePNG(px, W, H));
  console.log("✅ tilted_bill.jpg written");
}

// ── Image 2: blurred_bill.jpg — Gaussian-blurred bill ─────────────────────────

{
  const W = 400, H = 400;
  const tmp = makePixels(W, H);
  fillRect(tmp, 0, 0, W, H, [255,255,255]);
  drawText(tmp, "MEDICAL BILL",        20, 20,  [0,0,0], 2);
  drawText(tmp, "PATIENT: PRIYA",      20, 55,  [0,0,0], 2);
  drawText(tmp, "PARACETAMOL 500MG",   20, 90,  [0,0,0], 2);
  drawText(tmp, "RS 8.50 PER TABLET",  20, 115, [0,0,0], 2);
  drawText(tmp, "QTY 30 = RS 255",     20, 140, [0,0,0], 2);
  drawText(tmp, "MRI SCAN",            20, 175, [0,0,0], 2);
  drawText(tmp, "RS 2500 PER SCAN",    20, 200, [0,0,0], 2);
  drawText(tmp, "TOTAL: RS 2755",      20, 240, [0,0,128], 2);

  // Box blur (radius 3) to simulate camera blur
  const px = makePixels(W, H);
  const R = 3;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r=0, g=0, b=0, n=0;
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const sy = y+dy, sx = x+dx;
          if (sy>=0 && sy<H && sx>=0 && sx<W) {
            r += tmp[sy][sx][0]; g += tmp[sy][sx][1]; b += tmp[sy][sx][2]; n++;
          }
        }
      px[y][x] = [Math.round(r/n), Math.round(g/n), Math.round(b/n)];
    }
  }

  fs.writeFileSync(path.join(__dirname, "blurred_bill.jpg"), encodePNG(px, W, H));
  console.log("✅ blurred_bill.jpg written");
}

// ── Image 3: weird_table_bill.jpg — merged cells, no clear values ─────────────

{
  const W = 420, H = 460;
  const px = makePixels(W, H);
  fillRect(px, 0, 0, W, H, [248,248,240]);

  // Draw a weird table with merged cells and overlapping text
  drawText(px, "BILL NO: BL-2026-009",  10, 10, [0,0,0], 2);
  // Table grid
  const cols = [10, 140, 260, 360, 410];
  const rows = [45, 70, 100, 130, 160, 190, 230];
  for (const r of rows) fillRect(px, 10, r, W-20, 1, [0,0,0]);
  for (const c of cols) fillRect(px, c, 45, 1, rows[rows.length-1]-45, [0,0,0]);

  drawText(px, "SERVICE",   15, 50, [0,0,128], 1);
  drawText(px, "CODE",     145, 50, [0,0,128], 1);
  drawText(px, "RATE",     265, 50, [0,0,128], 1);
  drawText(px, "QTY",      365, 50, [0,0,128], 1);

  // Merged row spanning cols (no clean values — weird layout)
  drawText(px, "PROCEDURE CHARGES (SEE ANNEXURE)",  15, 75, [80,0,0], 1);
  drawText(px, "SRG-01", 15, 105, [0,0,0], 1);
  // Intentionally overlapping / garbled values
  drawText(px, "SEE", 145, 105, [0,0,0], 1);
  drawText(px, "NOTE", 145, 118, [0,0,0], 1);
  drawText(px, "N/A",  265, 105, [0,0,0], 1);
  drawText(px, "1",    365, 105, [0,0,0], 1);

  drawText(px, "MED SUPPLIES", 15, 135, [0,0,0], 1);
  drawText(px, "MED-X",       145, 135, [0,0,0], 1);
  // Missing value — blank cell
  drawText(px, "-",           365, 135, [0,0,0], 1);

  // Merged bottom row
  fillRect(px, 10, 190, W-20, 20, [220,220,255]);
  drawText(px, "TOTAL AS PER ANNEXURE ATTACHED",    15, 195, [0,0,128], 1);

  drawText(px, "PATIENT SIGNATURE:",  10, 250, [0,0,0], 1);
  fillRect(px, 10, 280, 200, 1, [0,0,0]);
  drawText(px, "AUTHORISED BY FINANCE",  10, 295, [100,100,100], 1);

  fs.writeFileSync(path.join(__dirname, "weird_table_bill.jpg"), encodePNG(px, W, H));
  console.log("✅ weird_table_bill.jpg written");
}

// ── Image 4: mixed_language_bill.jpg — Hindi + English ────────────────────────
// Hindi is approximated as bold Latin-looking characters in different layout

{
  const W = 420, H = 480;
  const px = makePixels(W, H);
  fillRect(px, 0, 0, W, H, [255,255,250]);

  // Header in "Hindi" style (simulated with different layout/color)
  drawText(px, "CITY HOSPITAL",   30, 12, [128,0,0],  2);
  // Simulate Hindi script lines as horizontal bars (OCR will get garbage / low conf)
  for (let i = 0; i < 5; i++) {
    fillRect(px, 20, 38 + i*4, 180, 2, [60,60,60]);
    fillRect(px, 205, 38 + i*3, 100, 2, [60,60,60]);
  }
  fillRect(px, 10, 60, W-20, 1, [0,0,0]);

  // English section — clear readable text
  drawText(px, "INVOICE NO: INV-2026-042", 10, 70,  [0,0,0], 2);
  drawText(px, "DATE: 09/08/2026",         10, 95,  [0,0,0], 2);
  fillRect(px, 10, 115, W-20, 1, [0,0,0]);

  drawText(px, "ITEM",   10, 122, [0,0,128], 2);
  drawText(px, "RATE",  220, 122, [0,0,128], 2);
  drawText(px, "TOTAL", 330, 122, [0,0,128], 2);
  fillRect(px, 10, 142, W-20, 1, [160,160,160]);

  // Mix: English item name, amounts
  drawText(px, "CROCIN TAB",     10, 150, [0,0,0], 2);
  drawText(px, "12.00",         220, 150, [0,0,0], 2);
  drawText(px, "240",           330, 150, [0,0,0], 2);

  // Simulate Hindi label before next item
  for (let i = 0; i < 3; i++) fillRect(px, 10, 178 + i*5, 140, 2, [60,60,60]);
  drawText(px, "500.00",        220, 178, [0,0,0], 2);
  drawText(px, "500",           330, 178, [0,0,0], 2);

  drawText(px, "BED CHARGES",    10, 205, [0,0,0], 2);
  drawText(px, "PER DAY",        10, 228, [0,0,0], 2);
  drawText(px, "800.00",        220, 205, [0,0,0], 2);
  drawText(px, "2400",          330, 205, [0,0,0], 2);

  fillRect(px, 10, 250, W-20, 2, [0,0,0]);

  // More Hindi-style bars before total
  for (let i = 0; i < 3; i++) fillRect(px, 10, 258 + i*5, 180, 2, [60,60,60]);
  drawText(px, "GRAND TOTAL",    10, 278, [128,0,0], 2);
  drawText(px, "3140",          330, 278, [128,0,0], 2);

  fillRect(px, 10, 300, W-20, 1, [0,0,0]);
  drawText(px, "THANK YOU",      130, 312, [100,100,100], 2);

  fs.writeFileSync(path.join(__dirname, "mixed_language_bill.jpg"), encodePNG(px, W, H));
  console.log("✅ mixed_language_bill.jpg written");
}

console.log("\nAll 4 adversarial images written to:", __dirname);
