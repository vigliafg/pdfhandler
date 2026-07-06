/**
 * PDF Toolkit — Extract Tool E2E Tests
 * 11 test cases
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose, waitForReload,
  modalExecuteBtn,
  selectRangeMode, setCustomRange,
  clickButton, deselectAllPages, selectAllPages,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Extract', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('1.1 Extract All → Single PDF', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'all');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-extracted.pdf');
    await waitForModalClose(page);
  });

  test('1.2 Extract All → Separate files (ZIP)', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await clickButton(page, 'Separate files (ZIP)');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-extracted.zip');
    await waitForModalClose(page);
  });

  test('1.3 Extract Current Page', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'current');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-extracted.pdf');
    await waitForModalClose(page);
  });

  test('1.4 Extract Selected Pages', async ({ page }) => {
    await selectAllPages(page);
    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'all');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-extracted.pdf');
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBe(initialCount);
  });

  test('1.5 Extract Custom Range 10-20,34,50-51', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-20, 34, 50-51');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download.suggestedFilename()).toContain('-extracted.pdf');
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBe(initialCount);
  });

  test('1.6 Extract Odd Pages (Subset)', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await page.locator('.fixed.inset-0.z-50 button:has-text("All pages")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Odd pages only")').click();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('1.7 Extract Even Pages (Subset)', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await page.locator('.fixed.inset-0.z-50 button:has-text("All pages")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Even pages only")').click();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForModalClose(page);
  });

  test('1.8 Extract + Delete After', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '5-10');
    await page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').check();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      clickExecute(page),
    ]);
    expect(download).toBeTruthy();
    await waitForReload(page, initialCount - 6);
  });

  test('1.9 Edge: Custom Range Empty → Execute disabled', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('1.10 Edge: Selected with 0 Selections → radio disabled', async ({ page }) => {
    await deselectAllPages(page);
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    const selectedRadio = page.locator('.fixed.inset-0.z-50 label:has-text("Selected pages") input[type="radio"]');
    await expect(selectedRadio).toBeDisabled();
    await closeModal(page);
  });

  test('1.11 Edge: Custom Range Out of Bounds', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '999-1000');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });
});
