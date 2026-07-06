import { Page, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Hardcoded PDF file paths ──────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PDF_A = path.join(PROJECT_ROOT, 'Internazionale - 26 Giugno 2026.pdf');
const PDF_B = path.join(PROJECT_ROOT, 'Il Venerdi di Repubblica - 26 Giugno 2026.pdf');
const PDF_C = path.join(PROJECT_ROOT, 'Corriere della Sera Sette - 26 Giugno 2026.pdf');
const PDF_H = path.join(PROJECT_ROOT, 'Harrison 2025 _ 22nd Edition.pdf');

export const PDFS = { A: PDF_A, B: PDF_B, C: PDF_C, H: PDF_H };

// ─── Selectors ─────────────────────────────────────────────────────
export const SEL = {
  // Editor mode toggle
  editorBtn: 'header button:has-text("Editor")',
  viewerBtn: 'header button:has-text("Viewer")',
  // Tools dropdown
  toolsBtn: '#editor-toolbar-portal button:has-text("Tools")',
  // File name display in header
  fileName: 'header span.truncate',
  // Modal
  modal: 'div.fixed.inset-0.z-50',
  modalCancelBtn: 'div.fixed.inset-0.z-50 button:has-text("Cancel")',
  // RangeSelector custom input
  customRangeInput: 'input[placeholder="e.g. 10-20, 34, 50-51"]',
  // Download confirmation modal
  downloadConfirm: 'text=Download PDF?',
  downloadBtn: 'button:has-text("Download")',
};

// ─── Helper functions ──────────────────────────────────────────────

/** Load a PDF file by setting it on the hidden main file input. */
export async function loadPDF(page: Page, filePath: string) {
  // Use page-level setInputFiles which doesn't require element visibility
  await page.setInputFiles('input[type="file"][accept]', filePath, { timeout: 15000 });
  // Wait for PDF to load (file name appears in header, replacing "No PDF loaded")
  await page.waitForFunction(() => {
    const el = document.querySelector('header span.truncate');
    return el && el.textContent && !el.textContent.includes('No PDF');
  }, { timeout: 30_000 });
  // Wait for loading to finish
  await page.waitForTimeout(1500);
}

/** Switch to Editor mode. */
export async function switchToEditor(page: Page) {
  await page.click(SEL.editorBtn);
  await page.waitForTimeout(500);
}

/** Switch to Viewer mode. */
export async function switchToViewer(page: Page) {
  await page.click(SEL.viewerBtn);
  await page.waitForTimeout(500);
}

/** Open the Tools dropdown in Editor mode. */
export async function openToolsDropdown(page: Page) {
  const btn = page.locator(SEL.toolsBtn);
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();
  await page.waitForTimeout(300);
}

/** Select a page tool from the dropdown by its label text (exact match). */
export async function selectPageTool(page: Page, label: string) {
  await openToolsDropdown(page);
  // Use exact match to avoid false matches like "Extract" matching "Extract & Montage"
  const item = page.locator(`#editor-toolbar-portal button`).filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).last();
  await item.click();
  await page.waitForTimeout(500);
}

/** Get the current page count from the header. */
export async function getPageCount(page: Page): Promise<number> {
  // The page count span is the one inside the header next to the file name
  const allNums = page.locator('header span.tabular-nums');
  const count = await allNums.count();
  // Usually the last one in the header before the flex spacer is the page count
  for (let i = 0; i < count; i++) {
    const text = await allNums.nth(i).textContent();
    if (text && /^\(\d[\d,]*\)$/.test(text.trim())) {
      const match = text.match(/\(([\d,]+)\)/);
      if (match) return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  return 0;
}

/** Get the current file name from the header. */
export async function getFileName(page: Page): Promise<string> {
  const el = page.locator(SEL.fileName);
  return (await el.textContent()) ?? '';
}

/** Wait for a modal to appear. */
export async function waitForModal(page: Page) {
  await page.waitForSelector(SEL.modal, { timeout: 10_000 });
  await page.waitForTimeout(300);
}

/** Close a modal by clicking Cancel. */
export async function closeModal(page: Page) {
  const cancelBtn = page.locator(SEL.modalCancelBtn);
  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cancelBtn.click();
    await page.waitForTimeout(300);
  }
}

/** Get the execute button in a modal's footer (for checking disabled state or clicking). */
export function modalExecuteBtn(page: Page) {
  return page.locator('.fixed.inset-0.z-50 .border-t.border-zinc-800 button').last();
}

/** Click the Execute button in a modal. */
export async function clickExecute(page: Page) {
  const btn = modalExecuteBtn(page);
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
}

/** Wait for a modal to close (after executing an operation). */
export async function waitForModalClose(page: Page) {
  await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

/** Wait for the PDF to reload after an in-place operation. */
export async function waitForReload(page: Page, expectedPages?: number, timeout: number = 30_000) {
  await page.waitForTimeout(2000);
  if (expectedPages !== undefined) {
    await expect(async () => {
      const count = await getPageCount(page);
      expect(count).toBe(expectedPages);
    }).toPass({ timeout });
  }
}

/** Reload the original PDF A (Internazionale). */
export async function reloadPDF_A(page: Page) {
  await loadPDF(page, PDF_A);
  await page.waitForTimeout(1000);
}

/** Click a radio button by label text in the RangeSelector. */
export async function selectRangeMode(
  page: Page,
  mode: 'all' | 'current' | 'selected' | 'custom',
  modalSelector: string = '.fixed.inset-0.z-50',
  nth: number = 0,
) {
  const labelText = {
    all: 'All pages',
    current: 'Current page',
    selected: 'Selected pages',
    custom: 'Custom range',
  }[mode];
  const label = page.locator(`${modalSelector} label:has-text("${labelText}")`).nth(nth);
  const radio = label.locator('input[type="radio"]');
  // Use click() instead of check() to avoid React controlled-component validation issues
  const isEnabled = await radio.isEnabled({ timeout: 1000 }).catch(() => false);
  if (isEnabled) {
    await radio.click({ force: true });
  }
  await page.waitForTimeout(200);
}

/** Click a destination radio (First/Last/Custom) by label text inside a modal. */
export async function selectDestPage(
  page: Page,
  mode: 'first' | 'last' | 'custom',
  modalSelector: string = '.fixed.inset-0.z-50',
) {
  const labelText = {
    first: 'First',
    last: 'Last',
    custom: 'Custom:',
  }[mode];
  const label = page.locator(`${modalSelector} label:has-text("${labelText}")`).last();
  const radio = label.locator('input[type="radio"]');
  // Use click() instead of check() to avoid React controlled-component validation
  if (await radio.isEnabled({ timeout: 1000 }).catch(() => false)) {
    await radio.click({ force: true });
  }
  await page.waitForTimeout(200);
}

/** Type in the custom range input inside a modal. */
export async function setCustomRange(page: Page, text: string, nth: number = 0) {
  const inputs = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 10-20, 34, 50-51"]');
  if (nth === 0) {
    await inputs.first().fill(text);
  } else {
    await inputs.nth(nth).fill(text);
  }
  await page.waitForTimeout(200);
}

/** Click a button by exact text content. */
export async function clickButton(page: Page, text: string) {
  const btn = page.getByRole('button', { name: text, exact: true });
  await btn.click();
  await page.waitForTimeout(300);
}

/** Check the confirmation checkbox in the Delete modal ("I understand this will permanently delete..."). */
export async function confirmDeleteCheckbox(page: Page) {
  const cb = page.locator('.fixed.inset-0.z-50 label:has-text("I understand") input[type="checkbox"]');
  await cb.check();
  await page.waitForTimeout(200);
}

/** Select pages by clicking the "All" button in the editor toolbar. */
export async function selectAllPages(page: Page) {
  const btn = page.locator('#editor-toolbar-portal button:has-text("All")');
  await btn.click();
  await page.waitForTimeout(500);
}

/** Deselect all pages. Safe to call even when nothing is selected. */
export async function deselectAllPages(page: Page) {
  const btn = page.locator('#editor-toolbar-portal button:has-text("None")');
  if (await btn.isEnabled({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

// ─── TOC Helpers ──────────────────────────────────────────────────

const TOC_TOGGLE = '#editor-toolbar-portal button[title="Table of Contents"]';
const TOC_PANEL = '.w-72.h-full.bg-zinc-900';

/** Open the TOC side panel by clicking the TOC toggle button. */
export async function openTOCPanel(page: Page) {
  const btn = page.locator(TOC_TOGGLE);
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  // Only click if panel is not already open
  const isOpen = await btn.evaluate((el) => el.classList.contains('bg-amber-500/15'));
  if (!isOpen) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

/** Close the TOC side panel by clicking the backdrop or toggle. */
export async function closeTOCPanel(page: Page) {
  // If panel is open, click the backdrop area to close
  const backdrop = page.locator('.w-\\[200vw\\].h-full.bg-transparent');
  if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
    await backdrop.click();
    await page.waitForTimeout(300);
  }
}

/** Wait for the TOC panel to finish loading bookmarks (spinner gone, items visible or "no TOC" shown). */
export async function waitForTOCLoaded(page: Page, timeout: number = 120_000) {
  // Wait for the TOC panel to appear
  await page.waitForSelector(TOC_PANEL, { timeout: 10_000 });
  // Wait until either bookmark items appear OR the "No table of contents found" message appears
  await expect(async () => {
    const spinner = page.locator(`${TOC_PANEL} .animate-spin`);
    const spinnerCount = await spinner.count();
    // When spinner disappears, content is loaded
    expect(spinnerCount).toBe(0);
  }).toPass({ timeout });
  // Give a small extra buffer for rendering
  await page.waitForTimeout(500);
}

/** Prepare the app: load PDF A, switch to Editor. */
export async function setupTest(page: Page, pdfPath: string = PDF_A) {
  await page.goto('/');
  await loadPDF(page, pdfPath);
  await switchToEditor(page);
}
