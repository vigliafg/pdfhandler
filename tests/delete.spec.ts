/**
 * PDF Toolkit — Delete Tool E2E Tests
 * 7 test cases
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForReload,
  modalExecuteBtn,
  selectRangeMode, setCustomRange,
  confirmDeleteCheckbox,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Delete', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('3.1 Delete Current Page', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'current');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
  });

  test('3.2 Delete Selected Pages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 10) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '5-8');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 4);
  });

  test('3.3 Delete Custom Range 10-20', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 25) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-20');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 11);
  });

  test('3.4 Delete Odd Pages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount === 1) {
      test.skip(true, 'PDF has only 1 page');
      return;
    }
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    const subsetBtn = page.locator('.fixed.inset-0.z-50 button:has-text("All pages")');
    if (await subsetBtn.isVisible()) {
      await subsetBtn.click();
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Odd pages only")').click();
      await page.waitForTimeout(200);
    }
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    const expectedRemaining = Math.ceil(initialCount / 2);
    await waitForReload(page, expectedRemaining);
  });

  test('3.5 Delete Even Pages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount === 1) {
      test.skip(true, 'PDF has only 1 page');
      return;
    }
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    const subsetBtn = page.locator('.fixed.inset-0.z-50 button:has-text("All pages")');
    if (await subsetBtn.isVisible()) {
      await subsetBtn.click();
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Even pages only")').click();
      await page.waitForTimeout(200);
    }
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    const expectedRemaining = Math.floor(initialCount / 2);
    await waitForReload(page, expectedRemaining);
  });

  test('3.6 Edge: Cannot Delete All Pages', async ({ page }) => {
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('3.7 Edge: Less than 5 pages remaining warning', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 8) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, `1-${initialCount - 3}`);
    await confirmDeleteCheckbox(page);
    await expect(modalExecuteBtn(page)).toBeEnabled();
    await closeModal(page);
  });
});
