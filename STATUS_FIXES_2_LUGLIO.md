# Stato Fix — 2 Luglio 2026

## ✅ FIX 1: Import JSZip mancante in `pdfOperations.ts`

**File:** `src/lib/pdfOperations.ts`

**Problema:** Tutti i 12 test Split (sezione 7) fallivano con timeout di 120s in attesa del download. La causa era un `ReferenceError: JSZip is not defined` a runtime — le funzioni `splitPages`, `splitByMarkers`, `splitByRanges`, `splitByTOC` usano `new JSZip()` ma mancava l'import.

**Fix:** Aggiunto `import JSZip from 'jszip';` a riga 2.

**Risultato:** ✅ 135 test passati, 0 falliti, 7 skipped (i Merge).

---

## ✅ FIX 2 (completato 4 Luglio): Test Merge 8.1–8.7

**File modificato:**
- `tests/full-suite.spec.ts`

### Root Cause:
`setInputFiles` con array di file (`[PDF_A, PDF_B]`) non attiva correttamente l'`onChange` di React per tutti i file — solo il primo veniva processato. Questo perché il `FileList` costruito da Playwright può causare race condition con l'elaborazione asincrona di `pdf-lib` dentro `addFiles()`.

### Fix:
Modificato l'helper `uploadMergeFiles` per caricare i file **uno alla volta** in un loop `for...of`, attendendo il badge `pp.` dopo ogni file:

```ts
for (const file of files) {
  await page.getByTestId('merge-file-input').setInputFiles(file);
  await page.waitForSelector('.fixed.inset-0.z-50 span:has-text("pp.")', { timeout: 30_000 });
  await page.waitForTimeout(500);
}
```

### Risultato:
✅ Tutti i 7 test Merge (8.1–8.7) passano. Suite completa: **142 test passati, 0 falliti.**
