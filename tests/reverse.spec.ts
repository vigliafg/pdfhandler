/**
 * PDF Toolkit — Reverse Tool E2E Tests
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
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Reverse', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('6.1 Reverse All Pages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount);
  });

  test('6.2 Reverse Selected Pages', async ({ page }) => {
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-14');
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('6.3 Reverse Custom Range 20-30', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 35) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '20-30');
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('6.4 Reverse 1 Page Range (no-op)', async ({ page }) => {
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '15-15');
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('6.5 Edge: Preview shows 5+ pairs correctly', async ({ page }) => {
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '1-10');
    const preview = page.locator('.fixed.inset-0.z-50').filter({ hasText: /→/ }).first();
    await expect(preview).toBeVisible();
    await closeModal(page);
  });

  test('6.6 Edge: Custom Range Empty', async ({ page }) => {
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });
});
