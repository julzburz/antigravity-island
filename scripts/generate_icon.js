const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function generateIconPNG(size = 512) {
  const rawData = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;
  const rBg = size * 0.44;
  const rPupil = size * 0.08;

  let pos = 0;
  for (let y = 0; y < size; y++) {
    rawData[pos++] = 0; // Filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0, g = 0, b = 0, a = 0;

      if (dist <= rBg) {
        // Anti-aliased outer edge
        const edgeAlpha = Math.min(1, Math.max(0, rBg - dist));
        
        // Dark Obsidian glass body (#09090b with radial gradient to #18181b)
        const tBg = dist / rBg;
        r = Math.round(9 + 15 * tBg);
        g = Math.round(9 + 15 * tBg);
        b = Math.round(11 + 20 * tBg);
        a = Math.round(255 * edgeAlpha);

        // Neon border ring at rBg - 4
        if (dist >= rBg - 12 && dist <= rBg) {
          const borderT = 1 - Math.abs(dist - (rBg - 6)) / 6;
          r = Math.round(r * (1 - borderT) + 56 * borderT);
          g = Math.round(g * (1 - borderT) + 189 * borderT);
          b = Math.round(b * (1 - borderT) + 248 * borderT);
        }

        // Two expressive Bloub eyes
        const eyeOffset = size * 0.14;
        const eyeY = cy - size * 0.02;

        const leftDist = Math.sqrt((x - (cx - eyeOffset)) ** 2 + (y - eyeY) ** 2);
        const rightDist = Math.sqrt((x - (cx + eyeOffset)) ** 2 + (y - eyeY) ** 2);

        // Neon glow around eyes
        const glowRadius = rPupil * 2.2;
        if (leftDist < glowRadius || rightDist < glowRadius) {
          const minDist = Math.min(leftDist, rightDist);
          const glowT = Math.max(0, 1 - minDist / glowRadius) * 0.6;
          r = Math.min(255, Math.round(r + 56 * glowT));
          g = Math.min(255, Math.round(g + 189 * glowT));
          b = Math.min(255, Math.round(b + 248 * glowT));
        }

        // Left Eye Pupil (Sky/Cyan vibrant #38bdf8 to #e0f2fe)
        if (leftDist <= rPupil) {
          const pEdge = Math.min(1, Math.max(0, rPupil - leftDist));
          r = Math.round(56 + 180 * (1 - leftDist / rPupil));
          g = Math.round(189 + 50 * (1 - leftDist / rPupil));
          b = 255;
        }

        // Right Eye Pupil
        if (rightDist <= rPupil) {
          const pEdge = Math.min(1, Math.max(0, rPupil - rightDist));
          r = Math.round(56 + 180 * (1 - rightDist / rPupil));
          g = Math.round(189 + 50 * (1 - rightDist / rPupil));
          b = 255;
        }

        // Smile curve below eyes
        const smileY = cy + size * 0.12;
        const smileDist = Math.abs(dy - size * 0.12);
        if (Math.abs(dx) < size * 0.12 && smileDist < 6) {
          const smileT = (1 - smileDist / 6) * 0.8;
          r = Math.min(255, Math.round(r + 125 * smileT));
          g = Math.min(255, Math.round(g + 211 * smileT));
          b = Math.min(255, Math.round(b + 252 * smileT));
        }
      }

      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

const iconPng = generateIconPNG(256);
const pngPath = path.join(buildDir, 'icon.png');
fs.writeFileSync(pngPath, iconPng);
console.log('Created high-res icon PNG at:', pngPath, 'Size:', iconPng.length, 'bytes');

// Create Windows .ico wrapping the 256x256 PNG data (official Windows Vista/10/11 PNG-in-ICO format)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // Number of images = 1

const icoDirEntry = Buffer.alloc(16);
icoDirEntry.writeUInt8(0, 0); // Width 256 (0 = 256)
icoDirEntry.writeUInt8(0, 1); // Height 256 (0 = 256)
icoDirEntry.writeUInt8(0, 2); // Color palette 0
icoDirEntry.writeUInt8(0, 3); // Reserved 0
icoDirEntry.writeUInt16LE(1, 4); // Color planes 1
icoDirEntry.writeUInt16LE(32, 6); // Bits per pixel 32
icoDirEntry.writeUInt32LE(iconPng.length, 8); // Size of image data
icoDirEntry.writeUInt32LE(22, 12); // Offset to image data (6 header + 16 dir entry = 22)

const icoFile = Buffer.concat([icoHeader, icoDirEntry, iconPng]);
const icoPath = path.join(buildDir, 'icon.ico');
fs.writeFileSync(icoPath, icoFile);
console.log('Created Windows icon.ico at:', icoPath, 'Size:', icoFile.length, 'bytes');
