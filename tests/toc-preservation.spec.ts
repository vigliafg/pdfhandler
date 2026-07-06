/**
 * PDF Toolkit — TOC Preservation E2E Tests
 * 6 test cases (Harrison PDF, 277 MB, 591 bookmarks)
 */
import { test, expect } from '@playwright/test';
import {
  setupTest,
  selectPageTool,
  getPageCount,
  waitForModal, closeModal, clickExecute, waitForModalClose, waitForReload,
  modalExecuteBtn,
  selectRangeMode, selectDestPage, setCustomRange,
  confirmDeleteCheckbox,
  openTOCPanel, closeTOCPanel, waitForTOCLoaded,
  PDFS,
} from './helpers';

test.describe('TOC Preservation', () => {
  test('10.1 Delete + TOC Panel', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '5');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
    await page.waitForTimeout(5000);
    await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 });

    await openTOCPanel(page);
    await waitForTOCLoaded(page, 120_000);

    const tocPanel = page.locator('.w-72.h-full.bg-zinc-900');
    await expect(tocPanel).toBeVisible();

    const partItems = tocPanel.locator('button:has-text("PART")');
    const partCount = await partItems.count();
    console.log(`TOC Panel after delete: ${partCount} PART items visible`);
    expect(partCount).toBeGreaterThanOrEqual(15);

    const part1 = tocPanel.locator('button:has-text("PART 1")').first();
    await expect(part1).toBeVisible({ timeout: 10_000 });
    await part1.click();
    await page.waitForTimeout(500);

    await closeTOCPanel(page);
  });

  test('10.2 Delete + Split TOC', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '1');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
    await page.waitForTimeout(5000);
    await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 });

    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 300_000 });
    await tocRadio.check({ force: true });
    await page.waitForTimeout(500);

    const topLevelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Top Level")');
    await expect(topLevelBtn).toBeVisible({ timeout: 10_000 });
    await topLevelBtn.click();
    await page.waitForTimeout(300);
    await expect(topLevelBtn).toHaveClass(/border-green-600/);

    const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files \(\d+\)/ }).first();
    await expect(previewSection).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(300);

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 30_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`Split by TOC after delete p.1: ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(15);
    expect(fileCount).toBeLessThanOrEqual(30);

    await closeModal(page);
  });

  test('10.3 Rotate + TOC Tree', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '3-5');
    const angle180Btn = page.locator('.fixed.inset-0.z-50 button:has-text("180°")');
    await angle180Btn.click();
    await page.waitForTimeout(200);
    await clickExecute(page);
    await waitForReload(page, initialCount);
    await waitForModalClose(page);

    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 300_000 });
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

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 30_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`TOC Tree after rotate: PART 1 selected → ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(18);
    expect(fileCount).toBeLessThanOrEqual(30);

    await closeModal(page);
  });

  test('10.4 Reverse + TOC navigation', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount);
    await page.waitForTimeout(5000);
    await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 });

    await openTOCPanel(page);
    await waitForTOCLoaded(page, 120_000);

    const tocPanel = page.locator('.w-72.h-full.bg-zinc-900');
    await expect(tocPanel).toBeVisible();

    const partItems = tocPanel.locator('button:has-text("PART")');
    const partCount = await partItems.count();
    console.log(`TOC Panel after reverse: ${partCount} PART items visible`);
    expect(partCount).toBeGreaterThanOrEqual(15);

    const part1 = tocPanel.locator('button:has-text("PART 1")').first();
    await expect(part1).toBeVisible({ timeout: 10_000 });
    await part1.click();
    await page.waitForTimeout(500);

    await closeTOCPanel(page);
  });

  test('10.5 Move + Split preview', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    await selectPageTool(page, 'Copy / Move');
    await waitForModal(page);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move")').click();
    await page.waitForTimeout(300);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '50-55');
    await page.locator('.fixed.inset-0.z-50 button:has-text("After")').click();
    await selectDestPage(page, 'custom');
    const destInput = page.locator('.fixed.inset-0.z-50 input[type="number"]').last();
    await destInput.fill('100');
    await clickExecute(page);
    await waitForReload(page, initialCount);
    await page.waitForTimeout(5000);
    await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 });

    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 300_000 });
    await tocRadio.check({ force: true });
    await page.waitForTimeout(500);

    const topLevelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Top Level")');
    await expect(topLevelBtn).toBeVisible({ timeout: 10_000 });
    await topLevelBtn.click();
    await page.waitForTimeout(300);
    await expect(topLevelBtn).toHaveClass(/border-green-600/);

    const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files \(\d+\)/ }).first();
    await expect(previewSection).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(300);

    const previewLine = page.locator('.fixed.inset-0.z-50 .font-mono').filter({ hasText: /pp\./ }).first();
    await expect(previewLine).toBeVisible({ timeout: 10_000 });

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 30_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`Split by TOC after move: ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(18);
    expect(fileCount).toBeLessThanOrEqual(30);

    await closeModal(page);
  });

  test('10.6 Full cycle: Delete → Rotate → Reverse → Split TOC', async ({ page }) => {
    test.setTimeout(300_000);
    await setupTest(page, PDFS.H);
    await page.waitForTimeout(5000);

    const initialCount = await getPageCount(page);

    // Step 1: Delete page 5
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '5');
    await confirmDeleteCheckbox(page);
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
    await waitForModalClose(page);

    // Step 2: Rotate all pages 90° CW
    await selectPageTool(page, 'Rotate');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
    await waitForModalClose(page);

    // Step 3: Reverse pages 10-20
    await selectPageTool(page, 'Reverse');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    await setCustomRange(page, '10-20');
    await clickExecute(page);
    await waitForReload(page, initialCount - 1);
    await waitForModalClose(page);

    // Step 4: Open Split by TOC
    await selectPageTool(page, 'Split');
    await waitForModal(page);

    const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
    await expect(tocRadio).toBeEnabled({ timeout: 300_000 });
    await tocRadio.check({ force: true });
    await page.waitForTimeout(500);

    const topLevelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Top Level")');
    await expect(topLevelBtn).toBeVisible({ timeout: 10_000 });
    await topLevelBtn.click();
    await page.waitForTimeout(300);
    await expect(topLevelBtn).toHaveClass(/border-green-600/);

    const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files \(\d+\)/ }).first();
    await expect(previewSection).toBeVisible({ timeout: 10_000 });

    const partItems = page
      .locator('.fixed.inset-0.z-50 .max-h-52 .cursor-pointer')
      .filter({ hasText: /PART/ });
    const partCount = await partItems.count();
    console.log(`Full cycle: ${partCount} PART items in TOC tree`);
    expect(partCount).toBeGreaterThanOrEqual(15);

    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeEnabled({ timeout: 30_000 });
    const btnText = await executeBtn.textContent();
    expect(btnText).toMatch(/Split into \d+ files/);

    const match = btnText?.match(/Split into (\d+) files/);
    const fileCount = match ? parseInt(match[1], 10) : 0;
    console.log(`Full cycle split: ${fileCount} files`);
    expect(fileCount).toBeGreaterThanOrEqual(15);
    expect(fileCount).toBeLessThanOrEqual(30);

    await closeModal(page);
  });
});
