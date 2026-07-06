/**
 * PDF Toolkit — Reorder Tool E2E Tests
 * 7 test cases
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForReload,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;

test.describe('Reorder', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('9.1 Enter reorder mode', async ({ page }) => {
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    const applyBtn = page.locator('button:has-text("Apply Order")');
    await expect(applyBtn).toBeVisible();

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
  });

  test('9.2 Quick Swap: Two pages', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="A"]').fill('3');
    await page.locator('input[placeholder="B"]').fill('7');
    await page.waitForTimeout(200);

    const swapBtn = page.locator('button:has-text("Swap")');
    await expect(swapBtn).toBeEnabled();
    await swapBtn.click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Apply Order")').click();
    await waitForReload(page, initialCount);
  });

  test('9.3 Quick Swap: Same page → disabled', async ({ page }) => {
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="A"]').fill('5');
    await page.locator('input[placeholder="B"]').fill('5');

    await expect(page.locator('button:has-text("Swap")')).toBeDisabled();

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
  });

  test('9.4 Quick Swap: Out of range → disabled', async ({ page }) => {
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="A"]').fill('99999');
    await page.locator('input[placeholder="B"]').fill('5');

    await expect(page.locator('button:has-text("Swap")')).toBeDisabled();

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
  });

  test('9.5 Quick Swap: Empty input → disabled', async ({ page }) => {
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("Swap")')).toBeDisabled();

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
  });

  test('9.6 Cancel: Restores original order', async ({ page }) => {
    const initialCount = await getPageCount(page);
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="A"]').fill('3');
    await page.locator('input[placeholder="B"]').fill('7');
    await page.locator('button:has-text("Swap")').click();
    await page.waitForTimeout(300);

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);

    expect(await getPageCount(page)).toBe(initialCount);
  });

  test('9.7 Swap inputs reset on re-enter reorder', async ({ page }) => {
    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="A"]').fill('3');
    await page.locator('input[placeholder="B"]').fill('7');

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(500);

    await selectPageTool(page, 'Reorder');
    await page.waitForTimeout(1000);

    await expect(page.locator('input[placeholder="A"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="B"]')).toHaveValue('');

    await page.locator('#editor-toolbar-portal button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
  });
});
