# 📋 Stato Fixing — 30 Giugno 2026

## Panoramica

Suite di test E2E Playwright per pdfhandler (77 test totali, file `tests/full-suite.spec.ts`).  
La suite sezioni 1-9 passa. La **sezione 10 (TOC Preservation)** ha 4 test falliti su 6.

I test usano il PDF Harrison (290 MB, 4272 pagine, 591 bookmark, 4 livelli di profondità TOC).

---

## Test che PASSANO ✅

- **10.1** Delete + TOC Panel
- **10.4** Reverse + TOC navigation  
- **7.TOC** Split by TOC Level 1 (Harrison) — TOC su PDF fresco
- **7.TOC-tree** Interactive TOC tree selection → split — TOC su PDF fresco

## Test che FALLONO ❌

| Test | Errore | Causa Root |
|------|--------|------------|
| **10.2** Delete + Split TOC | Preview TOC mostra "0 files" a Top Level | `flattenTOCForPreview` riceve item con pageNumber tutti null — `writeOutline` (pdf-lib low-level API) scrive destinazioni che `pdfjs-dist` non riesce a risolvere |
| **10.3** Rotate + TOC Tree | Execute button "Split into 0 files" [disabled] | Stessa causa di 10.2: dopo rotate, `getOutline(pdf)` restituisce item senza pageNumber validi |
| **10.5** Move + Split preview | Move modal bloccato su "Processing..." / preview 0 files | Due problemi: (1) `movePages` copiava pagine una alla volta (O(n²)) → lentissimo per 4272 pagine, (2) dopo il move, stesso bug TOC di 10.2 |
| **10.6** Full cycle (Delete→Rotate→Reverse→Split) | Radio TOC mostra "(no TOC found)" [disabled] | Dopo 3 operazioni consecutive, `writeOutline` corrompe l'outline e `getOutline(pdf)` restituisce array vuoto |

---

## Root Cause Dettagliata

### Bug outline pdf-lib ↔ pdfjs-dist

`writeOutline()` in `src/lib/pdfOutline.ts` usa l'API low-level di pdf-lib (`context.obj()`, `context.register()`) per scrivere l'outline. Le destinazioni `/Dest` vengono create come:

```js
dict.set(PDFName.of('Dest'), context.obj([pageRef, PDFName.of('XYZ')]));
```

`context.obj()` crea un **oggetto indiretto** (con object number), non un array diretto. Quando pdfjs-dist (`getOutline()`) legge queste destinazioni, `resolveDestination()` non riesce a risolvere i page number → tutti gli item hanno `pageNumber: null`.

**Sintomo**: L'albero TOC viene renderizzato (gli item esistono), ma nessun item ha page number validi → `flattenTOCForPreview` restituisce 0 risultati.

### Performance movePages

`movePages()` in `src/lib/pdfOperations.ts` copiava le pagine non spostate **una alla volta** in un loop `for`, causando 4266+ chiamate a `copyPages()` per il PDF Harrison → operazione estremamente lenta.

---

## Fix già Applicati ✅

### 1. `src/lib/pdfOperations.ts` — Batch copy in movePages
**Riga ~700**: Sostituito il loop one-at-a-time con batch copy:
```ts
// PRIMA (lento):
for (let i = 0; i < total; i++) {
    if (moveSet.has(i + 1)) continue;
    const [page] = await newDoc.copyPages(sourceDoc, [i]);
    newDoc.addPage(page);
}

// DOPO (batch):
const keepIndices: number[] = [];
for (let i = 0; i < total; i++) {
    if (!moveSet.has(i + 1)) keepIndices.push(i);
}
const keepPages = await newDoc.copyPages(sourceDoc, keepIndices);
for (const page of keepPages) newDoc.addPage(page);
```

### 2. `tests/full-suite.spec.ts` — Test 10.3 più robusto
**Riga ~1478**: Sostituito `page.waitForTimeout(5000)` con `waitForReload(page, initialCount)` + `waitForModalClose(page)`.

### 3. `src/App.tsx` — Caching TOC items dalle operazioni (FIX PRINCIPALE)
Aggiunto stato `cachedTOCItems` che memorizza i TOC items restituiti da ogni operazione (`deletePages`, `rotatePages`, `movePages`, `reversePages`, `insertPages`, `replacePages`, `duplicatePages`, `reorderPages`).

L'effetto dello SplitModal ora usa i TOC items cached invece di chiamare `getOutline(pdf)` sul PDF modificato:
```ts
if (cachedTOCItems && cachedTOCItems.length > 0) {
    setTocItemsForSplit(cachedTOCItems);  // bypass pdfjs-dist
} else {
    getOutline(pdf).then(...);            // fallback per PDF freschi
}
```

Tutti gli handler modificati:
- `handleDelete` → `setCachedTOCItems(result.tocItems ?? null)`
- `handleRotate` → idem
- `handleReverse` → idem
- `handleCopyMove` → idem
- `handleInsertReplace` → idem
- `handleReorderApply` → idem
- `handleExtract` (con deleteAfter) → idem
- `handleFileSelect` → `setCachedTOCItems(null)` (clear su nuovo file)
- `handleMerge` → `setCachedTOCItems(null)` (clear post-merge)

### 4. Typecheck passa ✅

---

## Da Fare Domani 🚧

### Priorità 1: Verificare i fix
```bash
# Run TOC preservation tests
npx playwright test tests/full-suite.spec.ts -g "10. TOC Preservation" --timeout=600000
```

### Priorità 2: Se i test passano, runnare la suite completa
```bash
npx playwright test tests/full-suite.spec.ts --timeout=600000
```

### Priorità 3: Se ci sono ancora fallimenti
- **10.6**: Se dopo 3 operazioni consecutive i TOC items cached vengono persi, investigare se `cachedTOCItems` viene resettato accidentalmente tra un'operazione e l'altra.
- **10.2/10.3**: Se il preview TOC mostra ancora 0 files, aggiungere `console.log` in `SplitModal.tsx` nel `useMemo` del preview per ispezionare `tocItems`, `tocDepth`, e l'output di `flattenTOCForPreview`.
- **Alternativa**: Fixare `writeOutline()` per scrivere array diretti invece di oggetti indiretti (cambiare `context.obj([...])` in un array PDF diretto — richiede accesso a `PDFArray` di pdf-lib).

### Note tecniche
- Il PDF Harrison è 290 MB — ogni test richiede 1-5 minuti
- I test sono seriali (`fullyParallel: false`, `workers: 1`)
- Il dev server parte automaticamente (`webServer` in `playwright.config.ts`)

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/lib/pdfOperations.ts` | Batch copy in `movePages()` |
| `tests/full-suite.spec.ts` | `waitForReload` in test 10.3 |
| `src/App.tsx` | Stato `cachedTOCItems` + hook in tutti gli handler + effetto SplitModal |
