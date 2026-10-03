import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

// Integer control points: two triangles and the upper edge of a one-sided band.
const design = {
  grid: 16,
  size: 1024,
  palette: ['#eee', '#ccc', '#aaa'],
  wings: [
    { color: 1, points: [[6, 10], [5, 4], [10, 10]] },
    { color: 2, points: [[6, 10], [12, 3], [10, 11]] },
  ],
  line: { color: 2, width: 0.5, points: [[2, 10], [6, 10], [14, 12]] },
};
const asset = name => new URL(`../assets/${name}`, import.meta.url);
const coordinates = points => points.map(point => point.join(',')).join(' ');
const palette = Buffer.from(design.palette.flatMap(color =>
  [...color.slice(1)].map(digit => Number.parseInt(digit + digit, 16))));

function makeSvg() {
  // Clip a doubled stroke to the lower side or the near wing. Including the
  // wing in one continuous clip path allows the paint to overlap internally,
  // avoiding an antialiasing seam along their shared edge.
  const upper = design.line.points;
  const clip = [[0, upper[0][1]], ...upper.slice(1),
    [design.grid, upper.at(-1)[1]], [design.grid, design.grid], [0, design.grid]];
  const path = points => `M${points.map(point => point.join(' ')).join('L')}Z`;
  const [far, near] = design.wings;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${design.grid} ${design.grid}">\n`
    + '  <defs>\n'
    + `    <clipPath id="silhouette"><path d="${path(clip)}${path(near.points)}"/></clipPath>\n`
    + '  </defs>\n'
    + `  <rect width="${design.grid}" height="${design.grid}" fill="${design.palette[0]}"/>\n`
    + `  <polygon fill="${design.palette[far.color]}" points="${coordinates(far.points)}"/>\n`
    + '  <g clip-path="url(#silhouette)">\n'
    + `    <polygon fill="${design.palette[near.color]}" points="${coordinates(near.points)}"/>\n`
    + `    <polyline fill="none" stroke="${design.palette[design.line.color]}" stroke-width="${design.line.width * 2}" points="${coordinates(upper)}"/>\n`
    + '  </g>\n'
    + '</svg>\n';
}

// The given points form the visible upper edge. Offset only toward the lower
// side, retaining perpendicular end caps and a miter join at the corner.
function bandOutline({ points, width }) {
  const normals = points.slice(1).map(([x, y], index) => {
    const dx = x - points[index][0], dy = y - points[index][1];
    const length = Math.hypot(dx, dy);
    return [-dy / length, dx / length];
  });
  const lower = [];
  points.forEach(([x, y], index) => {
    const before = normals[Math.max(0, index - 1)];
    const after = normals[Math.min(normals.length - 1, index)];
    const scale = width / (1 + before[0] * after[0] + before[1] * after[1]);
    const dx = (before[0] + after[0]) * scale;
    const dy = (before[1] + after[1]) * scale;
    lower.push([x + dx, y + dy]);
  });
  return [...points, ...lower.reverse()];
}

function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function rasterize() {
  const { size, grid } = design;
  const shapes = [...design.wings, { color: design.line.color, points: bandOutline(design.line) }];
  // Each row starts with PNG filter type 0, followed by palette indices.
  const rows = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (const shape of shapes) {
      if (contains(shape.points, (x + 0.5) * grid / size, (y + 0.5) * grid / size)) {
        rows[y * (size + 1) + x + 1] = shape.color;
      }
    }
  }
  return rows;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

const signature = Buffer.from('89504e470d0a1a0a', 'hex');
function header() {
  const bytes = Buffer.alloc(13);
  bytes.writeUInt32BE(design.size, 0);
  bytes.writeUInt32BE(design.size, 4);
  bytes[8] = 8; // Eight-bit palette indices.
  bytes[9] = 3; // Indexed color, no alpha.
  return bytes;
}

function makePng(rows) {
  return Buffer.concat([
    signature, chunk('IHDR', header()), chunk('PLTE', palette),
    chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function verifyPng(png, expectedRows) {
  assert.ok(png.subarray(0, 8).equals(signature), 'PNG signature');
  const types = [], imageData = [];
  let offset = 8;
  while (offset < png.length) {
    assert.ok(offset + 12 <= png.length, 'Truncated chunk');
    const length = png.readUInt32BE(offset);
    const end = offset + 8 + length;
    assert.ok(end + 4 <= png.length, 'Truncated chunk data');
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, end);
    assert.equal(png.readUInt32BE(end), crc32(png.subarray(offset + 4, end)), `${type} checksum`);
    types.push(type);
    if (type === 'IHDR') assert.ok(data.equals(header()), '1024 × 1024, 8-bit indexed PNG');
    if (type === 'PLTE') assert.ok(data.equals(palette), 'Exact E/C/A palette');
    if (type === 'IDAT') imageData.push(data);
    if (type === 'IEND') assert.equal(length, 0, 'Empty IEND');
    offset = end + 4;
  }
  assert.equal(types[0], 'IHDR');
  assert.equal(types[1], 'PLTE');
  assert.equal(types.at(-1), 'IEND');
  assert.ok(types.length >= 4 && types.slice(2, -1).every(type => type === 'IDAT'), 'Only image chunks');
  const rows = inflateSync(Buffer.concat(imageData));
  assert.ok(rows.equals(expectedRows), 'Every pixel matches the design');
  const used = new Set();
  for (let y = 0; y < design.size; y++) for (let x = 0; x < design.size; x++) {
    used.add(rows[y * (design.size + 1) + x + 1]);
  }
  assert.deepEqual([...used].sort(), [0, 1, 2], 'All and only three colors are used');
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  console.error('Usage: node scripts/crane.mjs [--check]');
  process.exit(1);
}
const svg = makeSvg();
const rows = rasterize();
if (args[0] === '--check') {
  assert.equal(readFileSync(asset('CrAnE.svg'), 'utf8'), svg, 'SVG matches the design');
  verifyPng(readFileSync(asset('CrAnE.png')), rows);
  console.log('Verified: integer control points, 0.5 one-sided band, 1024 × 1024, three ACE colors, every pixel matches.');
} else {
  const png = makePng(rows);
  verifyPng(png, rows);
  mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
  writeFileSync(asset('CrAnE.svg'), svg);
  writeFileSync(asset('CrAnE.png'), png);
  console.log('Built assets/CrAnE.svg and assets/CrAnE.png.');
}
