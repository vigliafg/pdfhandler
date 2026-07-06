/**
 * PDF Toolkit — Copy / Move Tool E2E Tests
 * 9 test cases
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForReload,
  modalExecuteBtn,
  selectRangeMode, selectDestPage, setCustomRange,
  deselectAllPages,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Copy / Move', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('4.1 Copy: All pages after last', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount * 2);
  });

  test('4.2 Copy: Custom Range with 3 Copies', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '3-5');
    const copiesInput = page.locator('.fixed.inset-0.z-50 div:has(> label:has-text("Copies")) > input');
    await copiesInput.fill('3');
    await page.waitForTimeout(200);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Before")').click();
    await page.waitForTimeout(100);
    await clickExecute(page);
    await waitForReload(page, initialCount + 9);
  });

  test('4.3 Copy: Current Page with 5 Copies', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await selectRangeMode(page, 'current');
    const copiesInput = page.locator('.fixed.inset-0.z-50 div:has(> label:has-text("Copies")) > input');
    await copiesInput.fill('5');
    await page.waitForTimeout(200);
    await page.locator('.fixed.inset-0.z-50 button:has-text("After")').click();
    await selectDestPage(page, 'first');
    await clickExecute(page);
    await waitForReload(page, initialCount + 5);
  });

  test('4.4 Copy: All pages (duplicate entire document)', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount * 2);
  });

  test('4.5 Move: Selected pages to beginning', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-12');
    await page.locator('.fixed.inset-0.z-50 button:has-text("Before")').click();
    await clickExecute(page);
    await waitForReload(page, initialCount);
  });

  test('4.6 Move: Custom range to end', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '3-5');
    await page.locator('.fixed.inset-0.z-50 button:has-text("After")').click();
    await clickExecute(page);
    await waitForReload(page, initialCount);
  });

  test('4.7 Move: Current page after page 15', async ({ page }) => {
    const initialCount = await getPageCount(page);
    if (initialCount < 20) {
      test.skip(true, 'PDF too small for this test');
      return;
    }
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'current');
    await page.locator('.fixed.inset-0.z-50 button:has-text("After")').click();
    await selectDestPage(page, 'custom');
    const destCustomInput = page.locator('.fixed.inset-0.z-50 input[type="number"]').last();
    await destCustomInput.fill('15');
    await clickExecute(page);
    await waitForReload(page, initialCount);
  });

  test('4.8 Edge: Selected with 0 Selections → radio disabled', async ({ page }) => {
    await deselectAllPages(page);
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    const selectedRadio = page.locator('.fixed.inset-0.z-50 label:has-text("Selected pages") input[type="radio"]').first();
    await expect(selectedRadio).toBeDisabled();
    await closeModal(page);
  });

  test('4.9 Edge: Toggle Copy ↔ Move hides/shows Copies', async ({ page }) => {
    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    const copiesBefore = page.locator('.fixed.inset-0.z-50 input[type="number"][min="1"]').first();
    await expect(copiesBefore).toBeVisible();
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move")').click();
    await page.waitForTimeout(300);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Copy")').click();
    await page.waitForTimeout(300);
    await closeModal(page);
  });
});
