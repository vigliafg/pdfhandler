/**
 * pdfhandler — Rotate Tool E2E Tests
 * 6 test cases
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose, waitForReload,
  modalExecuteBtn,
  selectRangeMode, setCustomRange,
  deselectAllPages,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Rotate', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('5.1 Rotate All Pages 90° CW', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount);
  });

  test('5.2 Rotate Selected Pages 180°', async ({ page }) => {
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '3-5');
    const angleBtns = page.locator('.fixed.inset-0.z-50 button:has-text("180°")');
    await angleBtns.click();
    await page.waitForTimeout(200);
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('5.3 Rotate Custom Range 90° CCW', async ({ page }) => {
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-20');
    const ccwBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Counterclockwise")');
    if (await ccwBtn.isVisible()) {
      await ccwBtn.click();
    }
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('5.4 Rotate Current Page 180°', async ({ page }) => {
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'current');
    const angleBtns = page.locator('.fixed.inset-0.z-50 button:has-text("180°")');
    await angleBtns.click();
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('5.5 Edge: Selected with 0 Selections → radio disabled', async ({ page }) => {
    await deselectAllPages(page);
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    const selectedRadio = page.locator('.fixed.inset-0.z-50 label:has-text("Selected pages") input[type="radio"]').first();
    await expect(selectedRadio).toBeDisabled();
    await closeModal(page);
  });

  test('5.6 Edge: Custom Range Empty', async ({ page }) => {
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });
});
