/**
 * Self-contained test: verify writeOutline works on a real PDF.
 * Uses pdf-lib low-level API to write bookmarks into Internazionale PDF.
 * 
 * Usage: node scripts/test_outline.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { PDFDocument, PDFName, PDFNumber, PDFString, PDFArray, PDFNull } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = 'Harrison 2025 _ 22nd Edition.pdf';

console.log('=== Outline Write Test ===\n');

// ── Load PDF ─────────────────────────────────────────────
const fileData = readFileSync(PDF_PATH);

// pdfjs-dist needs its own copy (avoids detached buffer issue with large PDFs)
const bufForPdfJs = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
const pdfJsDoc = await pdfjsLib.getDocument({ data: bufForPdfJs }).promise;
const outline = await pdfJsDoc.getOutline();

if (!outline || outline.length === 0) {
  console.log('No outline found — test cannot continue.');
  process.exit(0);
}

// Count bookmarks
function countBookmarks(items) {
  let count = 0;
  for (const item of items) {
    count++;
    if (item.items?.length > 0) count += countBookmarks(item.items);
  }
  return count;
}

const totalPages = pdfJsDoc.numPages;
const bmBefore = countBookmarks(outline);
console.log(`PDF: ${PDF_PATH} (${totalPages} pages, ${bmBefore} bookmarks)`);

// pdf-lib needs its own independent copy of the buffer
const bufForPdfLib = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);

// ── Resolve page numbers ─────────────────────────────────
async function resolveDest(dest) {
  if (Array.isArray(dest) && dest.length > 0) {
    const ref = dest[0];
    if (ref && typeof ref === 'object' && 'num' in ref) {
      try { return (await pdfJsDoc.getPageIndex(ref)) + 1; }
      catch { return null; }
    }
  }
  return null;
}

async function resolveOutline(items) {
  const result = [];
  for (const item of items) {
    let pageNumber = null;
    if (item.dest) pageNumber = await resolveDest(item.dest);
    result.push({
      title: item.title || '',
      pageNumber,
      children: item.items ? await resolveOutline(item.items) : [],
    });
  }
  return result;
}

const tocItems = await resolveOutline(outline);
console.log(`Resolved outline: ${countBookmarks(tocItems)} items`);

// ── Step 1: Delete page 5 (simulate deletePages logic) ──
const pagesToDelete = [5];
const deleteSet = new Set(pagesToDelete);

let pdfDoc = await PDFDocument.load(bufForPdfLib, { ignoreEncryption: true });
const newDoc = await PDFDocument.create();
const keepIndices = [];
for (let i = 0; i < pdfDoc.getPageCount(); i++) {
  if (!deleteSet.has(i + 1)) keepIndices.push(i);
}
const copiedPages = await newDoc.copyPages(pdfDoc, keepIndices);
for (const p of copiedPages) newDoc.addPage(p);

// ── Step 2: Compute updated outline ─────────────────────
const mapping = new Map();
let newPage = 1;
for (let oldPage = 1; oldPage <= totalPages; oldPage++) {
  if (deleteSet.has(oldPage)) mapping.set(oldPage, null);
  else mapping.set(oldPage, newPage++);
}

function updateOutline(items) {
  const result = [];
  for (const item of items) {
    const children = updateOutline(item.children);
    const np = item.pageNumber !== null ? (mapping.get(item.pageNumber) ?? null) : null;
    if (np === null && children.length === 0) continue;
    result.push({ title: item.title, pageNumber: np, children });
  }
  return result;
}

const updatedOutline = updateOutline(tocItems);
console.log(`Updated outline after delete: ${countBookmarks(updatedOutline)} items`);

// ── Step 3: Write outline into new PDF (low-level API) ──
function getPageRef(doc, pageIndex) {
  try { return doc.getPage(pageIndex).ref; } catch { return null; }
}

function writeSiblings(doc, items, parentRef) {
  const context = doc.context;
  let firstRef = null, lastRef = null;
  let totalDescendants = 0;
  let prevRef = null, prevDict = null;

  for (const item of items) {
    const pageRef = item.pageNumber !== null ? getPageRef(doc, item.pageNumber - 1) : null;
    
    const dict = context.obj({
      Title: PDFString.of(item.title),
      Parent: parentRef,
    });

    if (pageRef) {
      const destArray = PDFArray.withContext(context);
      destArray.push(pageRef);
      destArray.push(PDFName.of('XYZ'));
      destArray.push(PDFNull);
      destArray.push(PDFNull);
      destArray.push(PDFNull);
      dict.set(PDFName.of('Dest'), destArray);
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

function writeOutline(doc, items) {
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

writeOutline(newDoc, updatedOutline);
console.log('Outline written to new PDF');

// ── Step 4: Save and verify ─────────────────────────────
const newBytes = await newDoc.save();
writeFileSync('/tmp/outline_test_output.pdf', Buffer.from(newBytes));
console.log('Saved to /tmp/outline_test_output.pdf');

const verifyDoc = await pdfjsLib.getDocument({ data: newBytes.buffer }).promise;
const verifyOutline = await verifyDoc.getOutline();
const bmAfter = verifyOutline ? countBookmarks(verifyOutline) : 0;

console.log(`\n=== Results ===`);
console.log(`Bookmarks before delete: ${bmBefore}`);
console.log(`Bookmarks after delete:  ${bmAfter}`);
console.log(`Lost: ${bmBefore - bmAfter} (from deleted page 5)`);

if (bmAfter > 0 && bmAfter >= bmBefore - 2) {
  console.log(`\n✓ PROTOTYPE WORKS — outline preserved after page deletion`);
  console.log(`  Open /tmp/outline_test_output.pdf to verify bookmarks manually.`);
} else {
  console.log(`\n✗ PROTOTYPE FAILED`);
}
