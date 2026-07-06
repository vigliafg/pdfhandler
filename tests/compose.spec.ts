/**
 * pdfhandler — Extract & Montage (Compose) Tool E2E Tests
 * 8 test cases — FASE 6
 */
import { test, expect } from '@playwright/test';
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

test.describe('Compose', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  async function uploadSourceFile(page: any, pdfPath: string) {
    // The Compose modal has a file input inside the drop zone
    const fileInput = page.locator('.fixed.inset-0.z-50 input[type="file"][accept]').first();
    await fileInput.setInputFiles(pdfPath);
    await page.waitForTimeout(1500);
  }

  test('11.1 Add chunk from single PDF and compose', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload a source PDF
    await uploadSourceFile(page, PDF_B);

    // Click "Add to composition" button
    const addBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")');
    await expect(addBtn).toBeEnabled({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(300);

    // Should have 1 chunk in the composition (PDF B all pages)
    const chunks = page.locator('.fixed.inset-0.z-50 .border-l-2');
    await expect(chunks).toHaveCount(1);

    // Execute
    await clickExecute(page);
    await waitForModalClose(page);

    // Page count should have changed (PDF B replaces current doc)
    expect(await getPageCount(page)).toBeGreaterThan(0);
  });

  test('11.2 Compose from 3 PDFs with different ranges', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload PDF B
    await uploadSourceFile(page, PDF_B);

    // Select custom range for B: pages 5-10
    const customBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Custom")').first();
    await customBtn.click();
    const rangeInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 5-10, 15"]').first();
    await rangeInput.fill('5-10');
    await page.waitForTimeout(200);

    // Add to composition
    const addBtn1 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first();
    await addBtn1.click();
    await page.waitForTimeout(300);

    // Upload PDF C
    await uploadSourceFile(page, PDF_C);

    // Custom range for C: pages 20-30
    const customBtns = page.locator('.fixed.inset-0.z-50 button:has-text("Custom")');
    await customBtns.last().click();
    const rangeInput2 = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 5-10, 15"]').last();
    await rangeInput2.fill('20-30');
    await page.waitForTimeout(200);

    // Add to composition
    const addBtn2 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').last();
    await addBtn2.click();
    await page.waitForTimeout(300);

    // Should have 2 chunks
    const chunks = page.locator('.fixed.inset-0.z-50 .border-l-2');
    await expect(chunks).toHaveCount(2);

    // Execute
    await clickExecute(page);
    await waitForModalClose(page);
    expect(await getPageCount(page)).toBeGreaterThan(0);
  });

  test('11.3 Drag & drop reorder chunks', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload PDF B and PDF C
    await uploadSourceFile(page, PDF_B);
    const addBtn1 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first();
    await addBtn1.click();
    await page.waitForTimeout(300);

    await uploadSourceFile(page, PDF_C);
    const addBtn2 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').last();
    await addBtn2.click();
    await page.waitForTimeout(300);

    // Verify 2 chunks
    const dragHandles = page.locator('.fixed.inset-0.z-50 [draggable="true"]');
    await expect(dragHandles).toHaveCount(2);

    // Drag the second chunk to the first position
    const source = dragHandles.nth(1);
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

    await closeModal(page);
  });

  test('11.4 Edit chunk range inline', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload PDF B with custom range 5-10
    await uploadSourceFile(page, PDF_B);
    const customBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Custom")').first();
    await customBtn.click();
    const rangeInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 5-10, 15"]').first();
    await rangeInput.fill('5-10');
    await page.waitForTimeout(200);

    const addBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Click the edit (gear) button on the chunk
    const editBtn = page.locator('.fixed.inset-0.z-50 button[title="Edit range"]');
    await editBtn.click();
    await page.waitForTimeout(300);

    // Edit inputs should appear — change to pages 8-12
    const startInput = page.locator('.fixed.inset-0.z-50 input[type="number"][min="1"]').first();
    const endInput = page.locator('.fixed.inset-0.z-50 input[type="number"][min="1"]').nth(1);
    await startInput.fill('8');
    await endInput.fill('12');
    await page.waitForTimeout(200);

    // Click the checkmark to apply
    const applyBtn = page.locator('.fixed.inset-0.z-50 button:has-text("✓")');
    await applyBtn.click();
    await page.waitForTimeout(300);

    // Verify the chunk now shows pp. 8–12
    const chunkText = page.locator('.fixed.inset-0.z-50 .border-l-2').first();
    await expect(chunkText).toContainText('pp. 8–12');

    await closeModal(page);
  });

  test('11.5 Remove chunk and recompose', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload PDF B and add to composition
    await uploadSourceFile(page, PDF_B);
    const addBtn1 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first();
    await addBtn1.click();
    await page.waitForTimeout(300);

    // Upload PDF C and add to composition
    await uploadSourceFile(page, PDF_C);
    const addBtn2 = page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').last();
    await addBtn2.click();
    await page.waitForTimeout(300);

    // Should have 2 chunks
    const chunks = page.locator('.fixed.inset-0.z-50 .border-l-2');
    await expect(chunks).toHaveCount(2);

    // Remove the first chunk (click the X button on first chunk)
    const removeBtns = page.locator('.fixed.inset-0.z-50 button[title="Remove chunk"]');
    await removeBtns.first().click();
    await page.waitForTimeout(300);

    // Should have 1 chunk remaining
    await expect(chunks).toHaveCount(1);
    await closeModal(page);
  });

  test('11.6 Multiple chunks from same PDF', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload PDF B
    await uploadSourceFile(page, PDF_B);

    // Add chunk 1: custom range 5-10
    const customBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Custom")').first();
    await customBtn.click();
    const rangeInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 5-10, 15"]').first();
    await rangeInput.fill('5-10');
    await page.waitForTimeout(200);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first().click();
    await page.waitForTimeout(300);

    // Add chunk 2: custom range 20-25
    await rangeInput.fill('20-25');
    await page.waitForTimeout(200);
    await page.locator('.fixed.inset-0.z-50 button:has-text("Add to composition")').first().click();
    await page.waitForTimeout(300);

    // Should have 2 chunks
    const chunks = page.locator('.fixed.inset-0.z-50 .border-l-2');
    await expect(chunks).toHaveCount(2);

    await closeModal(page);
  });

  test('11.7 Edge: Compose with 0 chunks → disabled', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Execute button should be disabled with no chunks
    await expect(modalExecuteBtn(page)).toBeDisabled();

    await closeModal(page);
  });

  test('11.8 Edge: Compose with only sources, no chunks → disabled', async ({ page }) => {
    await selectPageTool(page, 'Extract & Montage');
    await waitForModal(page);

    // Upload a PDF but don't add any chunks
    await uploadSourceFile(page, PDF_B);

    // Execute should still be disabled (only sources, no chunks)
    await expect(modalExecuteBtn(page)).toBeDisabled();

    await closeModal(page);
  });
});
