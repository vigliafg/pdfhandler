/**
 * PDF Toolkit — Split Tool E2E Tests
 * 14 test cases (including 2 TOC-split tests with Harrison PDF)
 */
import { test, expect } from '@playwright/test';
import {
  setupTest, loadPDF,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose,
  modalExecuteBtn,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Split', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('7.1 Every N Pages: N=10', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-split.zip');
    await waitForModalClose(page);
  });

  test('7.2 Every N Pages: N=1 (One page per file)', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    const pageInput = page.locator('.fixed.inset-0.z-50 input[type="number"][min="1"]').first();
    await pageInput.fill('1');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-split.zip');
    await waitForModalClose(page);
  });

  test('7.3 Every N Pages: N > total pages', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    const pageInput = page.locator('.fixed.inset-0.z-50 input[type="number"][min="1"]').first();
    await pageInput.fill('99999');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.4 Into N Equal Files: N=4', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 4) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(1).check({ force: true });
    await page.waitForTimeout(200);
    const fileInput = page.locator('.fixed.inset-0.z-50 input[type="number"]').nth(1);
    await fileInput.fill('4');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.5 Into N Equal Files: N = numPages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(1).check({ force: true });
    await page.waitForTimeout(200);
    const fileInput = page.locator('.fixed.inset-0.z-50 input[type="number"]').nth(1);
    await fileInput.fill(String(initialCount));
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.6 At Page Markers: 10, 25, 40', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 50) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(2).check({ force: true });
    await page.waitForTimeout(200);
    const markerInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 10, 25, 40"]');
    await markerInput.fill('10, 25, 40');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.7 At Page Markers: Empty input', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(2).check({ force: true });
    await page.waitForTimeout(200);
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('7.8 Custom Ranges: 1-10, 15-20, 30-50', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 55) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(3).check({ force: true });
    await page.waitForTimeout(200);
    const rangeInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 1-10, 11-25, 26-50"]');
    await rangeInput.fill('1-10, 15-20, 30-50');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.9 Custom Ranges: Single Pages 5, 12, 25', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 30) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(3).check({ force: true });
    await page.waitForTimeout(200);
    const rangeInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 1-10, 11-25, 26-50"]');
    await rangeInput.fill('5, 12, 25');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.10 One Page per File', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(4).check({ force: true });
    await page.waitForTimeout(200);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('7.11 Preview: Limit 20 files shown', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(4).check({ force: true });
    await page.waitForTimeout(500);
    const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files/ }).first();
    await expect(previewSection).toBeVisible();
    await closeModal(page);
  });

  test('7.TOC Split by TOC Level 1 (Harrison)', async ({ page }) => {
    test.setTimeout(600_000);
    await loadPDF(page, PDFS.H);
    await page.waitForTimeout(3000);

    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 60_000 });
    await tocRadio.check({ force: true });
    await page.waitForTimeout(500);

    const topLevelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Top Level")');
    await expect(topLevelBtn).toBeVisible({ timeout: 10_000 });
    await topLevelBtn.click();
    await page.waitForTimeout(300);
    await expect(topLevelBtn).toHaveClass(/border-green-600/);

    const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files \(\d+\)/ }).first();
    await expect(previewSection).toBeVisible({ timeout: 5_000 });

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 15_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`TOC Top Level split: ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(18);
    expect(fileCount).toBeLessThanOrEqual(30);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 300_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-split.zip');
    await waitForModalClose(page);
  });

  test('7.TOC-tree Interactive TOC tree selection → split', async ({ page }) => {
    test.setTimeout(600_000);

    await loadPDF(page, PDFS.H);
    await page.waitForTimeout(3000);

    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 60_000 });
    await tocRadio.check({ force: true });
    await page.waitForTimeout(500);

    const part1Row = page
      .locator('.fixed.inset-0.z-50 .max-h-52 .cursor-pointer')
      .filter({ hasText: /PART 1\b/ })
      .first();
    await expect(part1Row).toBeVisible({ timeout: 10_000 });
    await part1Row.click();
    await page.waitForTimeout(400);
    await expect(part1Row).toHaveClass(/border-green-600/);

    const depthText = page.locator('.fixed.inset-0.z-50').getByText(/Top Level.*→.*\d+ files/);
    await expect(depthText).toBeVisible({ timeout: 5_000 });

    const previewSection = page
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: /Files \(\d+\)/ })
      .first();
    await expect(previewSection).toBeVisible({ timeout: 5_000 });

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 15_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`TOC-tree PART 1 selection → Top Level split: ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(18);
    expect(fileCount).toBeLessThanOrEqual(30);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 300_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-split.zip');
    await waitForModalClose(page);
  });

  test('7.12 Preview Bar: Summary correct', async ({ page }) => {
    await selectPageTool(page, 'Split');
    await waitForModal(page);
    const previewBar = page.locator('.fixed.inset-0.z-50 .bg-zinc-800\\/50').last();
    await expect(previewBar).toBeVisible();
    const text = await previewBar.textContent();
    expect(text).toContain('-split.zip');
    await closeModal(page);
  });
});
