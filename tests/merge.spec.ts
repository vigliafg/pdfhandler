/**
 * pdfhandler — Merge Tool E2E Tests
 * 7 test cases
 */
import { test, expect, type Page } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose,
  modalExecuteBtn,
  PDFS,
} from './helpers';

const PDF_A = PDFS.A;
const PDF_B = PDFS.B;
const PDF_C = PDFS.C;

test.describe('Merge', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  async function uploadMergeFiles(page: Page, files: string[], timeout: number = 120_000) {
    for (const file of files) {
      await page.getByTestId('merge-file-input').setInputFiles(file);
      await page.waitForSelector('.fixed.inset-0.z-50 span:has-text("pp.")', { timeout: 30_000 });
      await page.waitForTimeout(500);
    }
    if (files.length >= 2) {
      await expect(modalExecuteBtn(page)).toBeEnabled({ timeout });
    }
  }

  test('8.1 Merge 2 PDFs', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A, PDF_B]);
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBeGreaterThan(0);
  });

  test('8.2 Merge 3 PDFs', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A, PDF_B, PDF_C], 180_000);
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBeGreaterThan(0);
  });

  test('8.3 Reorder with Up/Down buttons', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A, PDF_B, PDF_C], 180_000);

    const upButtons = page.locator('.fixed.inset-0.z-50 button[title="Move up"]');
    if (await upButtons.count() > 1) {
      await upButtons.nth(1).click();
      await page.waitForTimeout(300);
    }
    const downButtons = page.locator('.fixed.inset-0.z-50 button[title="Move down"]');
    if (await downButtons.count() > 0) {
      await downButtons.first().click();
      await page.waitForTimeout(300);
    }
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBeGreaterThan(0);
  });

  test('8.4 Drag & Drop in Merge', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A, PDF_B, PDF_C], 180_000);

    const dragHandles = page.locator('.fixed.inset-0.z-50 [draggable="true"]');
    if (await dragHandles.count() >= 3) {
      const source = dragHandles.nth(2);
      const target = dragHandles.first();
      const sourceBox = await source.boundingBox();
      const targetBox = await target.boundingBox();
      if (sourceBox && targetBox) {
        await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
    }
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('8.5 Merge: Verify preview shows page count', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A, PDF_B]);
    const previewBar = page.locator('.fixed.inset-0.z-50 .bg-zinc-800\\/50').last();
    await expect(previewBar).toBeVisible();
    await clickExecute(page);
    await waitForModalClose(page);
  });

  test('8.6 Merge with 1 file only → disabled', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await uploadMergeFiles(page, [PDF_A]);
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });

  test('8.7 Edge: No files loaded → disabled', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    await expect(modalExecuteBtn(page)).toBeDisabled();
    await closeModal(page);
  });
});
