/**
 * Comprehensive TOC Preservation Test Suite
 * Tests all mapping functions and operations with Harrison 2025 PDF.
 * Imports mapping functions from the shared pdfMapping.ts module.
 * 
 * Usage: npx tsx scripts/test_toc_prototype.ts
 */
import { readFileSync } from 'fs';
import { PDFDocument, PDFName, PDFString, PDFNumber, degrees, toDegrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  computeDeletePageMapping,
  identityMapping,
  computeReorderMapping,
  computeInsertMapping,
  computeMoveMapping,
  computeReplaceMapping,
  computeDuplicateInlineMapping,
  computeReverseOrder,
  updateOutlineAfterMapping,
  type InsertDest,
  type MinimalTOCItem,
} from '../src/lib/pdfMapping';

const PDF_PATH = 'Harrison 2025 _ 22nd Edition.pdf';

const PASS = '✓';
const FAIL = '✗';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ${PASS} ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ${FAIL} ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg?: string) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── Count / validate bookmarks ──────────────────────────

function countBookmarks(items: any[]): number {
  let count = 0;
  for (const item of items) {
    count++;
    const kids = item.children || item.items;
    if (kids?.length > 0) count += countBookmarks(kids);
  }
  return count;
}

function validatePageNumbers(items: MinimalTOCItem[], maxPage: number): void {
  for (const item of items) {
    if (item.pageNumber !== null && (item.pageNumber < 1 || item.pageNumber > maxPage)) {
      throw new Error(`Bookmark "${item.title}" has invalid pageNumber ${item.pageNumber} (max: ${maxPage})`);
    }
    if (item.children?.length > 0) validatePageNumbers(item.children, maxPage);
  }
}

// ─── Main ─────────────────────────────────────────────────

console.log('=== TOC Preservation — Comprehensive Test Suite ===\n');
console.log(`PDF: ${PDF_PATH}\n`);

// Load PDF
const fileData = readFileSync(PDF_PATH);

// ── Extract TOC via pdfjs-dist ──
const bufForPdfJs = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
const pdfJsDoc = await pdfjsLib.getDocument({ data: bufForPdfJs }).promise;
const rawOutline = await pdfJsDoc.getOutline();
const totalPages = pdfJsDoc.numPages;

// Resolve page numbers from Dest arrays
async function resolveDest(dest: any): Promise<number | null> {
  if (Array.isArray(dest) && dest.length > 0) {
    const ref = dest[0];
    if (ref && typeof ref === 'object' && 'num' in ref) {
      try { return (await pdfJsDoc.getPageIndex(ref)) + 1; }
      catch { return null; }
    }
  }
  return null;
}

async function resolveOutline(items: any[]): Promise<MinimalTOCItem[]> {
  const result: MinimalTOCItem[] = [];
  for (const item of items) {
    let pageNumber: number | null = null;
    if (item.dest) pageNumber = await resolveDest(item.dest);
    result.push({
      title: item.title || '',
      pageNumber,
      children: item.items ? await resolveOutline(item.items) : [],
    });
  }
  return result;
}

const tocItems = await resolveOutline(rawOutline);
const bmCount = countBookmarks(tocItems);
console.log(`Total pages: ${totalPages}`);
console.log(`Total bookmarks: ${bmCount}\n`);

// ──────────────────────────────────────────────────────────
// SECTION 1: Unit tests — Mapping functions
// ──────────────────────────────────────────────────────────

console.log('── Section 1: Mapping Function Unit Tests ──\n');

console.log('1a. computeDeletePageMapping:');
test('delete p.5 on 10pp', () => {
  const m = computeDeletePageMapping(10, [5]);
  assert(m.get(1) === 1, 'p.1→1');
  assert(m.get(4) === 4, 'p.4→4');
  assert(m.get(5) === null, 'p.5 deleted');
  assert(m.get(6) === 5, 'p.6→5');
  assert(m.get(10) === 9, 'p.10→9');
});
test('delete p.12 from [10,11,12,13]', () => {
  const m = computeDeletePageMapping(13, [12]);
  assert(m.get(12) === null, 'p.12 deleted');
  assert(m.get(13) === 12, 'p.13→12');
});
test('delete multiple ranges [3-5] and [10-12] on 15pp', () => {
  const m = computeDeletePageMapping(15, [3,4,5,10,11,12]);
  assert(m.get(2) === 2, 'p.2 unchanged');
  assert(m.get(3) === null, 'p.3 deleted');
  assert(m.get(6) === 3, 'p.6→3 (shifted -3)');
  assert(m.get(9) === 6, 'p.9→6 (shifted -3)');
  assert(m.get(10) === null, 'p.10 deleted');
  assert(m.get(13) === 7, 'p.13→7 (shifted -6)');
});

console.log('\n1b. identityMapping:');
test('identity on 5 pages', () => {
  const m = identityMapping(5);
  for (let i = 1; i <= 5; i++) assert(m.get(i) === i, `p.${i}→${i}`);
});

console.log('\n1c. computeReorderMapping:');
test('full reverse', () => {
  const m = computeReorderMapping([5,4,3,2,1]);
  assert(m.get(5) === 1, '5→1');
  assert(m.get(1) === 5, '1→5');
});
test('swap p.3↔p.7', () => {
  const m = computeReorderMapping([1,2,7,4,5,6,3,8,9,10]);
  assert(m.get(1) === 1, '1→1');
  assert(m.get(3) === 7, '3→7');
  assert(m.get(7) === 3, '7→3');
});

console.log('\n1d. computeInsertMapping:');
test('insert 3 after p.5 on 10pp', () => {
  const m = computeInsertMapping(10, 3, { location: 'after', page: 5 });
  assert(m.get(1) === 1, 'p.1→1');
  assert(m.get(5) === 5, 'p.5→5');
  assert(m.get(6) === 9, 'p.6→9');
  assert(m.get(10) === 13, 'p.10→13');
});
test('insert 2 before p.1 on 10pp', () => {
  const m = computeInsertMapping(10, 2, { location: 'before', page: 1 });
  assert(m.get(1) === 3, 'p.1→3');
  assert(m.get(10) === 12, 'p.10→12');
});

console.log('\n1e. computeMoveMapping:');
test('move [3,4] after p.8 on 10pp', () => {
  const m = computeMoveMapping(10, [3,4], { location: 'after', page: 8 });
  assert(m.get(1) === 1, 'p.1→1');
  assert(m.get(3) === 7, 'p.3→7');
  assert(m.get(4) === 8, 'p.4→8');
  assert(m.get(5) === 3, 'p.5→3 (shifted left)');
  assert(m.get(7) === 5, 'p.7→5');
  assert(m.get(8) === 6, 'p.8→6');
  assert(m.get(9) === 9, 'p.9→9');
});
test('move [8,9] before p.3 on 10pp', () => {
  const m = computeMoveMapping(10, [8,9], { location: 'before', page: 3 });
  assert(m.get(1) === 1, 'p.1→1');
  assert(m.get(8) === 3, 'p.8→3');
  assert(m.get(9) === 4, 'p.9→4');
  assert(m.get(3) === 5, 'p.3→5');
});

console.log('\n1f. computeReplaceMapping:');
test('replace [5,6,7] with 4 pages on 10pp', () => {
  const m = computeReplaceMapping(10, [5,6,7], 4);
  assert(m.get(1) === 1, 'p.1 unchanged');
  assert(m.get(5) === null, 'p.5 replaced');
  assert(m.get(6) === null, 'p.6 replaced');
  assert(m.get(8) === 9, 'p.8→9 (shift +2)');
});
test('replace [5,6,7] with 2 pages (fewer)', () => {
  const m = computeReplaceMapping(10, [5,6,7], 2);
  assert(m.get(8) === 7, 'p.8→7 (shift -1)');
});
test('replace non-contiguous [3,8] with 5 pages', () => {
  const m = computeReplaceMapping(10, [3,8], 5);
  assert(m.get(3) === null, 'p.3 replaced');
  assert(m.get(4) === 8, 'p.4→8');
  assert(m.get(8) === null, 'p.8 replaced');
  assert(m.get(9) === 12, 'p.9→12');
});

console.log('\n1g. computeDuplicateInlineMapping:');
test('duplicate [3,7] ×2 on 10pp', () => {
  const m = computeDuplicateInlineMapping(10, [3,7], 2);
  assert(m.get(1) === 1, 'p.1→1');
  assert(m.get(3) === 3, 'p.3→3 (original stays)');
  assert(m.get(4) === 6, 'p.4→6 (+2 from p.3 copies)');
  assert(m.get(7) === 9, 'p.7→9 (+2 from p.3 copies)');
  assert(m.get(8) === 12, 'p.8→12 (+4 cumulative)');
});

console.log('\n1h. computeReverseOrder:');
test('full reverse 5pp', () => {
  const o = computeReverseOrder(5, undefined);
  assert(o.length === 5, 'length 5');
  assert(o[0] === 5 && o[4] === 1, '[5,4,3,2,1]');
});
test('subset reverse [2,3,4] on 5pp', () => {
  const o = computeReverseOrder(5, [2,3,4]);
  assert(o.join(',') === '1,4,3,2,5', 'subset reversed');
});

// ──────────────────────────────────────────────────────────
// SECTION 2: Integration tests — Operations with Harrison PDF
// ──────────────────────────────────────────────────────────

console.log('\n── Section 2: Integration Tests (Harrison PDF) ──\n');

// Outline writer (still needs pdf-lib, so kept inline)
function writeOutline(doc: any, items: MinimalTOCItem[]): void {
  if (items.length === 0) return;
  const context = doc.context;
  const outlinesDict = context.obj({ Type: PDFName.of('Outlines') });
  const outlinesRef = context.register(outlinesDict);
  const { first, last, count } = writeSiblings(doc, items, outlinesRef);
  if (first) {
    outlinesDict.set(PDFName.of('First'), first);
    outlinesDict.set(PDFName.of('Last'), last);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(count));
  }
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
}

function writeSiblings(doc: any, items: MinimalTOCItem[], parentRef: any) {
  const context = doc.context;
  let firstRef: any = null, lastRef: any = null;
  let totalDescendants = 0;
  let prevRef: any = null, prevDict: any = null;

  for (const item of items) {
    let pageRef: any = null;
    if (item.pageNumber !== null) {
      try { pageRef = doc.getPage(item.pageNumber - 1).ref; } catch {}
    }
    const dict = context.obj({
      Title: PDFString.of(item.title),
      Parent: parentRef,
    });
    if (pageRef) {
      dict.set(PDFName.of('Dest'), context.obj([pageRef, PDFName.of('XYZ')]));
    }
    if (prevRef) dict.set(PDFName.of('Prev'), prevRef);
    const ref = context.register(dict);
    if (prevDict) prevDict.set(PDFName.of('Next'), ref);
    if (!firstRef) firstRef = ref;
    lastRef = ref;
    totalDescendants++;
    if (item.children.length > 0) {
      const child = writeSiblings(doc, item.children, ref);
      if (child.first) {
        dict.set(PDFName.of('First'), child.first);
        dict.set(PDFName.of('Last'), child.last);
        dict.set(PDFName.of('Count'), PDFNumber.of(child.count));
      }
      totalDescendants += child.count;
    }
    prevRef = ref;
    prevDict = dict;
  }
  return { first: firstRef, last: lastRef, count: totalDescendants };
}

// Helper: perform a page operation and verify TOC
async function testOp(name: string, opFn: (buf: ArrayBuffer, toc: MinimalTOCItem[] | undefined) => Promise<{ bytes: Uint8Array; tocItems?: MinimalTOCItem[] }>) {
  const buf = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
  
  // Step 1: Perform operation without TOC (baseline)
  await opFn(buf, undefined);
  
  // Step 2: Perform operation WITH TOC
  const resultWithTOC = await opFn(buf, tocItems);
  
  // Re-open the output PDF and check its outline
  const verifyDoc = await pdfjsLib.getDocument({ 
    data: resultWithTOC.bytes.buffer.slice(
      resultWithTOC.bytes.byteOffset,
      resultWithTOC.bytes.byteOffset + resultWithTOC.bytes.byteLength
    ) 
  }).promise;
  const verifyOutline = await verifyDoc.getOutline();
  const bmAfter = verifyOutline ? countBookmarks(verifyOutline) : 0;
  
  // Parse TOC from output
  const tocAfter = await resolveOutline(verifyOutline || []);
  const verifyPages = verifyDoc.numPages;
  
  // Validate all page numbers are in range
  if (tocAfter.length > 0) {
    validatePageNumbers(tocAfter, verifyPages);
  }
  
  test(name, () => {
    assert(bmAfter > 0, `Expected bookmarks, got ${bmAfter}`);
    assert(bmAfter >= bmCount - 3, `Too many bookmarks lost: ${bmCount} → ${bmAfter}`);
  });
  
  return { bmAfter, verifyPages, tocAfter };
}

async function deleteOp(buf: ArrayBuffer, pages: number[], toc?: MinimalTOCItem[]) {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const delSet = new Set(pages.map(p => p - 1));
  const keep: number[] = [];
  for (let i = 0; i < total; i++) if (!delSet.has(i)) keep.push(i);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(doc, keep);
  copied.forEach((p: any) => newDoc.addPage(p));
  let bytes = await newDoc.save();
  
  if (toc && toc.length > 0) {
    const mapping = computeDeletePageMapping(total, pages);
    const updated = updateOutlineAfterMapping(toc, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes = await d.save();
    }
    return { bytes, tocItems: updated };
  }
  return { bytes };
}

// 2a. Delete page 5
console.log('\n2a. Delete page 5:');
await testOp('delete p.5 preserves TOC', async (buf, toc) => deleteOp(buf, [5], toc));

// 2b. Delete multiple ranges
console.log('\n2b. Delete pages [5,6,7] and [100,101]:');
await testOp('delete multi-range preserves TOC', async (buf, toc) => deleteOp(buf, [5,6,7,100,101], toc));

// 2c. Rotate pages (identity mapping)
console.log('\n2c. Rotate pages 3-5:');
await testOp('rotate preserves TOC (identity)', async (buf, toc) => {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const targetSet = new Set([2,3,4]); // 0-based for pp.3-5
  const newDoc = await PDFDocument.create();
  const indices = Array.from({length: total}, (_, i) => i);
  const pages = await newDoc.copyPages(doc, indices);
  pages.forEach((p: any, i: number) => {
    if (targetSet.has(i)) {
      const d = toDegrees(p.getRotation());
      p.setRotation(degrees((d + 90) % 360));
    }
    newDoc.addPage(p);
  });
  let bytes = await newDoc.save();
  
  if (toc && toc.length > 0) {
    const mapping = identityMapping(total);
    const updated = updateOutlineAfterMapping(toc, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes = await d.save();
    }
    return { bytes, tocItems: updated };
  }
  return { bytes };
});

// 2d. Reverse all pages
console.log('\n2d. Reverse all pages:');
await testOp('full reverse preserves TOC count', async (buf, toc) => {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const reversed = Array.from({length: total}, (_, i) => total - 1 - i);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(doc, reversed);
  pages.forEach((p: any) => newDoc.addPage(p));
  let bytes = await newDoc.save();
  
  if (toc && toc.length > 0) {
    const newOrder = computeReverseOrder(total);
    const mapping = computeReorderMapping(newOrder);
    const updated = updateOutlineAfterMapping(toc, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes = await d.save();
    }
    return { bytes, tocItems: updated };
  }
  return { bytes };
});

// 2e. Insert pages (simulated — insert blank page)
console.log('\n2e. Insert 1 page after p.5:');
await testOp('insert after preserves TOC', async (buf, toc) => {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const newDoc = await PDFDocument.create();
  const indices = Array.from({length: total}, (_, i) => i);
  const pages = await newDoc.copyPages(doc, indices);
  pages.forEach((p: any) => newDoc.addPage(p));
  const [blank] = await newDoc.copyPages(doc, [4]); // 0-based page 5
  newDoc.insertPage(5, blank);
  let bytes = await newDoc.save();
  
  if (toc && toc.length > 0) {
    const mapping = computeInsertMapping(total, 1, { location: 'after', page: 5 });
    const updated = updateOutlineAfterMapping(toc, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes = await d.save();
    }
    return { bytes, tocItems: updated };
  }
  return { bytes };
});

// 2f. Move pages
console.log('\n2f. Move pages 10-12 after page 50:');
await testOp('move preserves TOC', async (buf, toc) => {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const movedSet = new Set([9,10,11]); // 0-based, pages 10-12
  const sortedMoved = [9,10,11];
  
  const newDoc = await PDFDocument.create();
  for (let i = 0; i < total; i++) {
    if (movedSet.has(i)) continue;
    const [page] = await newDoc.copyPages(doc, [i]);
    newDoc.addPage(page);
  }
  const movedBefore = sortedMoved.filter(i => i + 1 <= 50).length;
  const adjDest = 50 - movedBefore;
  const movedPages = await newDoc.copyPages(doc, sortedMoved);
  for (let i = movedPages.length - 1; i >= 0; i--) {
    newDoc.insertPage(Math.min(adjDest, newDoc.getPageCount()), movedPages[i]);
  }
  let bytes = await newDoc.save();
  
  if (toc && toc.length > 0) {
    const mapping = computeMoveMapping(total, [10,11,12], { location: 'after', page: 50 });
    const updated = updateOutlineAfterMapping(toc, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes = await d.save();
    }
    return { bytes, tocItems: updated };
  }
  return { bytes };
});

// 2g. Full cycle: Delete + Rotate (chain of operations)
console.log('\n2g. Full cycle (Delete pp.3-5, then Rotate pp.10-15):');
test('full cycle preserves TOC', async () => {
  const buf = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
  
  const result1 = await deleteOp(buf, [3,4,5], tocItems);
  
  const doc2 = await PDFDocument.load(result1.bytes, { ignoreEncryption: true });
  const total2 = doc2.getPageCount();
  const targetSet = new Set([9,10,11,12,13,14]);
  const newDoc2 = await PDFDocument.create();
  const indices2 = Array.from({length: total2}, (_, i) => i);
  const pages2 = await newDoc2.copyPages(doc2, indices2);
  pages2.forEach((p: any, i: number) => {
    if (targetSet.has(i)) {
      const d = toDegrees(p.getRotation());
      p.setRotation(degrees((d + 90) % 360));
    }
    newDoc2.addPage(p);
  });
  let bytes2 = await newDoc2.save();
  
  if (result1.tocItems && result1.tocItems.length > 0) {
    const mapping = identityMapping(total2);
    const updated = updateOutlineAfterMapping(result1.tocItems, mapping);
    if (updated.length > 0) {
      const d = await PDFDocument.load(bytes2, { ignoreEncryption: true });
      writeOutline(d, updated);
      bytes2 = await d.save();
    }
  }
  
  const verifyDoc = await pdfjsLib.getDocument({ 
    data: bytes2.buffer.slice(bytes2.byteOffset, bytes2.byteOffset + bytes2.byteLength) 
  }).promise;
  const verifyOutline = await verifyDoc.getOutline();
  const bmAfter = verifyOutline ? countBookmarks(verifyOutline) : 0;
  
  assert(bmAfter > 0, 'Bookmarks present after chain');
  assert(bmAfter >= bmCount - 5, `Too many lost in chain: ${bmCount} → ${bmAfter}`);
  
  const tocAfter = await resolveOutline(verifyOutline || []);
  validatePageNumbers(tocAfter, verifyDoc.numPages);
  return true;
});

// ──────────────────────────────────────────────────────────
// Results
// ──────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  console.log(`\n${FAIL} SOME TESTS FAILED`);
  process.exit(1);
} else {
  console.log(`\n${PASS} ALL TESTS PASSED — TOC preservation prototype is working!`);
}
