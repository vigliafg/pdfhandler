/**
 * PDF Toolkit — Insert / Replace Tool E2E Tests
 * 12 test cases
 */
import { test, expect, type Page } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose,
  modalExecuteBtn,
  selectRangeMode, selectDestPage, setCustomRange,
  deselectAllPages, selectAllPages,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;
const PDF_B = PDFS.B;

test.describe('Insert / Replace', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  async function uploadSource(page: Page, pdfPath: string) {
    const sourceInput = page.locator('.fixed.inset-0.z-50 input[type="file"]');
    await sourceInput.setInputFiles(pdfPath);
    await page.waitForTimeout(1000);
  }

  test('2.1 Insert: All pages from B after last of A', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await uploadSource(page, PDF_B);
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBeGreaterThan(initialCount);
  });

  test('2.2 Insert: Custom range from B before first page', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await uploadSource(page, PDF_B);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '5-10');
    await page.locator('.fixed.inset-0.z-50 button:has-text("Before")').click();
    await selectDestPage(page, 'first');
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('2.3 Insert: Position custom After page 10', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await uploadSource(page, PDF_B);
    await page.locator('.fixed.inset-0.z-50 button:has-text("After")').click();
    await selectDestPage(page, 'custom');
    const destCustomInput = page.locator('.fixed.inset-0.z-50 input[type="number"]').last();
    await destCustomInput.fill('10');
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('2.4 Replace: All pages of A with all of B', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await uploadSource(page, PDF_B);
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).not.toBe(initialCount);
  });

  test('2.5 Replace: Current page with range from B', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'current');
    await uploadSource(page, PDF_B);
    await selectRangeMode(page, 'custom', '.fixed.inset-0.z-50', 1);
    await setCustomRange(page, '3-7', 1);
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('2.6 Replace: Selected pages', async ({ page }) => {
    await selectAllPages(page);
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await uploadSource(page, PDF_B);
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('2.7 Replace: Custom range target + custom range source', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '15-20');
    await uploadSource(page, PDF_B);
    await selectRangeMode(page, 'custom', '.fixed.inset-0.z-50', 1);
    await setCustomRange(page, '10-15', 1);
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('2.8 Edge: No source file → disabled', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('2.9 Edge: Toggle Insert ↔ Replace changes UI', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Insert")').click();
    await page.waitForTimeout(300);
    await closeModal(page);
  });

  test('2.10 Edge: Replace with Selected + 0 selections → radio disabled', async ({ page }) => {
    await deselectAllPages(page);
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    const selectedRadio = page.locator('.fixed.inset-0.z-50 label:has-text("Selected pages") input[type="radio"]').first();
    await expect(selectedRadio).toBeDisabled();
    await closeModal(page);
  });

  test('2.11 Edge: Replace Custom range empty → disabled', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Replace")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'custom');
    await uploadSource(page, PDF_B);
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('2.12 Edge: Source Custom range empty → disabled', async ({ page }) => {
    await selectPageTool(page, 'Insert / Replace');
    await waitForModal(page);
    await uploadSource(page, PDF_B);
    await selectRangeMode(page, 'custom');
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });
});
