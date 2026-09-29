import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(process.cwd(), 'dist', 'client');
const rawLimit = Number(process.env.BUNDLE_MAX_RAW_KB ?? 500) * 1024;
const gzipLimit = Number(process.env.BUNDLE_MAX_GZIP_KB ?? 180) * 1024;

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : entry.name.endsWith('.js') ? [path] : [];
  });
}

const chunks = filesIn(root).map((path) => {
  const source = readFileSync(path);
  return {
    file: relative(root, path).replaceAll('\\', '/'),
    raw: source.byteLength,
    gzip: gzipSync(source).byteLength,
  };
}).sort((left, right) => right.raw - left.raw);

const totalRaw = chunks.reduce((sum, chunk) => sum + chunk.raw, 0);
const totalGzip = chunks.reduce((sum, chunk) => sum + chunk.gzip, 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

console.log(`Client JavaScript: ${chunks.length} chunks · ${kb(totalRaw)} raw · ${kb(totalGzip)} gzip`);
console.table(chunks.slice(0, 8).map((chunk) => ({
  chunk: chunk.file,
  raw: kb(chunk.raw),
  gzip: kb(chunk.gzip),
})));

const oversized = chunks.filter((chunk) => chunk.raw > rawLimit || chunk.gzip > gzipLimit);
if (oversized.length) {
  console.error(`Bundle budget exceeded (${kb(rawLimit)} raw / ${kb(gzipLimit)} gzip per chunk):`);
  for (const chunk of oversized) console.error(`- ${chunk.file}: ${kb(chunk.raw)} raw, ${kb(chunk.gzip)} gzip`);
  process.exitCode = 1;
}
