// Generates simple brand PNG icons for PWA
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// #5e2e55 brand on #faf7f2 cream — minimal flat icon
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const row = Buffer.alloc(1 + size * 3);
  const raw = [];
  const cream = [250, 247, 242];
  const brand = [94, 46, 85];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;

  for (let y = 0; y < size; y++) {
    const rowBuf = Buffer.alloc(1 + size * 3);
    rowBuf[0] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const inside = dx * dx + dy * dy <= r * r;
      const rgb = inside ? brand : cream;
      const o = 1 + x * 3;
      rowBuf[o] = rgb[0];
      rowBuf[o + 1] = rgb[1];
      rowBuf[o + 2] = rgb[2];
    }
    raw.push(rowBuf);
  }

  const compressed = zlib.deflateSync(Buffer.concat(raw));
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(join(publicDir, `icon-${size}.png`), png(size));
  console.log(`Wrote icon-${size}.png`);
}
