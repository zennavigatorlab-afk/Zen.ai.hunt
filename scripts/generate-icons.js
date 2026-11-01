import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateIcon(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (rowStride + 1));

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;
  const ringR = width * 0.32;
  const ringWidth = Math.max(3, width * 0.05);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowStride + 1);
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base background: Obsidian #090D16
      let r = 9, g = 13, b = 22, a = 255;

      // Outer squircle corner check if not maskable
      if (!isMaskable) {
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerR));
        if (Math.sqrt(qx * qx + qy * qy) > cornerR) {
          a = 0;
        }
      }

      if (a > 0) {
        // Intelligence Ring
        const ringDiff = Math.abs(dist - ringR);
        if (ringDiff < ringWidth) {
          const factor = 1 - (ringDiff / ringWidth);
          // Violet / Cyan gradient along angle
          const angle = Math.atan2(dy, dx);
          const t = (Math.sin(angle) + 1) / 2;
          const ringR_col = Math.round(99 * (1 - t) + 6 * t);
          const ringG_col = Math.round(102 * (1 - t) + 182 * t);
          const ringB_col = Math.round(241 * (1 - t) + 212 * t);

          r = Math.round(r * (1 - factor) + ringR_col * factor);
          g = Math.round(g * (1 - factor) + ringG_col * factor);
          b = Math.round(b * (1 - factor) + ringB_col * factor);
        }

        // Inner Zen Core
        const coreR = width * 0.1;
        if (dist < coreR) {
          const cf = 1 - (dist / coreR);
          r = Math.round(r * (1 - cf) + 165 * cf);
          g = Math.round(g * (1 - cf) + 180 * cf);
          b = Math.round(b * (1 - cf) + 252 * cf);
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateIcon(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateIcon(180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generateIcon(64));
console.log('Icons generated successfully.');
