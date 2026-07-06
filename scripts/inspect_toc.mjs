import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'fs';

const data = readFileSync('Harrison 2025 _ 22nd Edition.pdf');
const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
const outline = await pdf.getOutline();

if (!outline || outline.length === 0) {
  console.log('No TOC found.');
  process.exit(1);
}

console.log(`Total top-level outline items: ${outline.length}\n`);

// Helper: resolve page number from destination
function resolvePage(dest) {
  if (typeof dest === 'string') return `named:${dest}`;
  if (Array.isArray(dest) && dest.length > 0) {
    const ref = dest[0];
    if (ref && typeof ref === 'object' && 'num' in ref) return `ref:${ref.num}`;
  }
  return '?';
}

// Walk and print hierarchy
function walk(items, depth = 0) {
  for (const item of items) {
    const indent = '  '.repeat(depth);
    const title = item.title || '(no title)';
    const page = item.dest ? ` [${resolvePage(item.dest)}]` : '';
    const marker = /^PART\s*\d+/i.test(title) ? ' ← PART!' : '';
    console.log(`${indent}L${depth} | ${title}${page}${marker}`);
    if (item.items && item.items.length > 0) {
      walk(item.items, depth + 1);
    }
  }
}

console.log('=== FULL TOC HIERARCHY ===\n');
walk(outline);

// Count PART entries by level
const partEntries = [];
function collectParts(items, depth = 0) {
  for (const item of items) {
    if (/^PART\s*\d+/i.test(item.title || '')) {
      partEntries.push({ title: item.title, depth });
    }
    if (item.items && item.items.length > 0) {
      collectParts(item.items, depth + 1);
    }
  }
}
collectParts(outline);

console.log(`\n=== PART entries found: ${partEntries.length} ===`);
for (const p of partEntries) {
  console.log(`  Depth ${p.depth}: ${p.title}`);
}

// Count items per level
const levelCounts = {};
function countByLevel(items, depth = 0) {
  levelCounts[depth] = (levelCounts[depth] || 0) + items.length;
  for (const item of items) {
    if (item.items && item.items.length > 0) {
      countByLevel(item.items, depth + 1);
    }
  }
}
countByLevel(outline);
console.log(`\n=== Items per depth level ===`);
for (const [level, count] of Object.entries(levelCounts)) {
  console.log(`  Level ${level}: ${count} items`);
}
