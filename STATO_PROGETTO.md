# 📄 pdfhandler — Stato del Progetto

**Data**: 1 Luglio 2026  
**Versione**: 3.2.0  
**Ambiente**: Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4 + Playwright 1.61

---

## 📊 Riepilogo Generale

| Metrica | Valore |
|---------|--------|
| File sorgente | **36** (`.ts` / `.tsx` / `.css`) |
| Righe di codice | **~8.200** |
| Tool implementati | **19** (9 Page + 10 Document + Reorder + TOC Panel) |
| Dipendenze runtime | 6 |
| DevDependencies | 15 |
| Test E2E Playwright | **83** (full-suite.spec.ts) |
| Smoke test Puppeteer | **18/18** |
| Smoke test DevTools CDP | **34/34** |
| Typecheck | ✅ 0 errori |

---

## 🏗️ Architettura

```
pdfhandler/
├── src/
│   ├── main.tsx                          # Entry point React
│   ├── App.tsx                           # Root: header, mode toggle, portal targets, wiring TOC
│   ├── index.css                         # Tailwind CSS v4
│   │
│   ├── lib/                              # Core logic (nessuna dipendenza React)
│   │   ├── pdfRenderer.ts               # pdfjs-dist: rendering pagine + getOutline() + getDestinations()
│   │   ├── pdfExtractor.ts              # Extract pagine + download PDF/ZIP
│   │   ├── pdfOperations.ts             # 11 operazioni pagina (delete, rotate, duplicate, ...)
│   │   ├── pdfOutline.ts                # writeOutline() via API low-level pdf-lib
│   │   ├── pdfMapping.ts                # 7 mapping functions (delete, reorder, insert, move, replace, ...)
│   │   ├── docOperations.ts             # Operazioni documento (metadata, watermark, pagination)
│   │   ├── crypto.ts                    # AES-GCM encrypt/decrypt (.pdf.enc)
│   │   └── export.ts                    # Estrazione testo, export immagini
│   │
│   ├── hooks/                            # Custom hooks React
│   │   ├── usePDFLoader.ts              # Caricamento PDF + reload (originale/copia di lavoro)
│   │   ├── usePageSelection.ts          # Selezione multi-pagina
│   │   ├── useToolState.ts              # Stato page tool (9 tool + modali + reorder)
│   │   ├── useDocToolState.ts           # Stato document tool (10 tool + modali)
│   │   └── useReorder.ts               # Drag & drop reorder + swap inline
│   │
│   └── components/
│       ├── StandardViewer.tsx            # Viewer con toolbar via createPortal
│       ├── Editor.tsx                    # Editor con toolbar unificata (dropdown Tools + swap reorder)
│       ├── PDFUploader.tsx               # Drag & drop upload
│       ├── TOCPanel.tsx                  # Pannello TOC navigabile (ricorsivo, 4 livelli)
│       ├── ThumbnailGrid.tsx             # Griglia virtuale (3-6 colonne) + drag & drop
│       ├── Thumbnail.tsx                 # Singola anteprima + badge View + numero pagina
│       │
│       └── doc/modals/                   # 15 modali
│           ├── shared.tsx                # DialogShell, RangeSelector, SubsetSelector, PreviewBar
│           ├── ExtractModal.tsx          # Range, Subset, Output type, Delete after
│           ├── InsertReplaceModal.tsx    # Insert/Replace unificato con toggle
│           ├── DeleteModal.tsx           # Range, Subset, Warning preview
│           ├── CopyMoveModal.tsx         # Copy/Move unificato con toggle
│           ├── RotateModal.tsx           # CW90 / 180 / CCW90, Range, Subset
│           ├── ReverseModal.tsx          # Range, Mapping preview
│           ├── SplitModal.tsx            # 6 modalità: N pagine / N file / markers / ranges / 1pp / TOC
│           ├── MergeModal.tsx            # Drag & drop + pulsanti ↑↓ per riordino
│           ├── InfoModal.tsx             # Proprietà PDF
│           ├── MetadataModal.tsx         # Editor metadati
│           ├── WatermarkTextModal.tsx    # Watermark testuale
│           ├── WatermarkImageModal.tsx   # Watermark immagine
│           ├── PageNumbersModal.tsx      # Numerazione pagine
│           ├── AddPagesModal.tsx         # Inserimento pagine bianche
│           └── CryptoModal.tsx           # Cifratura / Decifratura
```

---

## 🛠️ Tool Implementati

### 🔵 Page Tools (9 + Reorder mode)

| # | Tool | Modale | TOC Preservato? |
|---|------|:------:|:---------------:|
| 1 | 📤 **Extract** | ✅ | ✅ (deleteAfter) |
| 2 | 📋 **Insert / Replace** | ✅ | ✅ |
| 3 | 🗑️ **Delete** | ✅ | ✅ |
| 4 | 📋 **Copy / Move** | ✅ | ✅ |
| 5 | 🔄 **Rotate** | ✅ | ✅ |
| 6 | 🔀 **Reverse** | ✅ | ✅ |
| 7 | ✂️ **Split** (6 modalità) | ✅ | N/A (solo download) |
| 8 | 🔗 **Merge** | ✅ | N/A (TOC non merge) |
| 9 | ↕️ **Reorder** (con Swap inline) | 🔧 | ✅ |

### 🟢 Document Tools (10)

| # | Tool | Output | TOC |
|---|------|--------|-----|
| 1 | ℹ️ **Info** | Read-only | N/A |
| 2 | 🏷️ **Metadata** | In-place reload | Solo metadata XML |
| 3 | ᴀᴀ **Watermark testo** | In-place reload | N/A |
| 4 | 🖼️ **Watermark img** | In-place reload | N/A |
| 5 | ①②③ **Numera pagine** | In-place reload | N/A |
| 6 | ➕ **Aggiungi pagine** | In-place reload | N/A |
| 7 | 📝 **Estrai testo** | Download .txt | N/A |
| 8 | 🖼️→ZIP **Esporta PNG** | Download ZIP | N/A |
| 9 | 🔒 **Cifra** | Download .pdf.enc | N/A |
| 10 | 🔓 **Decifra** | Carica decifrato | N/A |

---

## 🧬 TOC Preservation — Architettura Completa

### Panoramica

Prima della v3.1, **tutte** le operazioni di pagina distruggevano silenziosamente l'albero dei bookmark/outline del PDF. La causa: `pdf-lib` non espone un'API pubblica per l'outline; ogni operazione crea un nuovo `PDFDocument` con `copyPages()` che copia solo il contenuto visuale.

La soluzione implementata è un sistema a tre livelli:

```
1. Estrazione  →  pdfjs-dist getOutline() legge l'outline originale
2. Mapping     →  compute*Mapping() calcola la nuova posizione di ogni pagina
3. Scrittura   →  writeOutline() scrive l'outline aggiornato via API low-level pdf-lib
```

### File coinvolti

| File | Ruolo |
|------|-------|
| `src/lib/pdfRenderer.ts` | `getOutline(pdf)` — estrae TOC via pdfjs-dist (`pdf.getOutline()` + `pdf.getDestinations()`) |
| `src/lib/pdfMapping.ts` | 7 mapping function per ogni operazione: `computeDeletePageMapping`, `identityMapping`, `computeReorderMapping`, `computeInsertMapping`, `computeMoveMapping`, `computeReplaceMapping`, `computeDuplicateInlineMapping` |
| `src/lib/pdfOutline.ts` | `writeOutline(doc, items)` — scrive albero outline via API low-level pdf-lib (`context.obj()`, `context.register()`); `writeUpdatedOutline(pdfBytes, toc)` — riapre il PDF e riscrive l'outline |
| `src/lib/pdfOperations.ts` | Ogni operazione accetta `tocItems?: TOCItem[]` e restituisce `{ bytes, tocItems? }` |
| `src/App.tsx` | Stato `cachedTOCItems` per passare il TOC tra operazioni; ogni handler estrae il TOC prima dell'operazione e memorizza il risultato |

### Flusso di ogni operazione

```
1. App.tsx: getOutline(pdf) → tocItems   (pdfjs-dist, asincrono)
2. Operazione(pdfBytes, pages, tocItems)
   a. Ricostruisci PDF con nuova struttura pagine
   b. Se tocItems presente:
      - Calcola mapping (compute*Mapping)
      - updateOutlineAfterMapping(tocItems, mapping)
      - writeUpdatedOutline(bytes, updatedTOC)
   c. Restituisci { bytes, tocItems }
3. App.tsx: reloadPDF(bytes) + setCachedTOCItems(tocItems)
```

### Mapping Function — Matrice completa

| Operazione | Mapping Function | Tipo |
|---|---|---|
| **Delete** | `computeDeletePageMapping(total, deletedPages)` | `Map<old, new\|null>` |
| **Rotate** | `identityMapping(total)` | Identità |
| **Reorder / Reverse / Swap** | `computeReorderMapping(newOrder)` | Rinumera tutte |
| **Insert / Copy (con dest)** | `computeInsertMapping(total, count, dest)` | Shift dopo insertion point |
| **Copy (inline, senza dest)** | `computeDuplicateInlineMapping(total, pages, copies)` | Shift dopo ogni copia |
| **Move** | `computeMoveMapping(total, movedPages, dest)` | Combinazione delete+insert |
| **Replace** | `computeReplaceMapping(total, replacedPages, replCount)` | Shift dopo replacement |

### Caching TOC tra operazioni

`App.tsx` mantiene uno stato `cachedTOCItems` per evitare di ri-estrarre il TOC via pdfjs-dist dopo ogni operazione:

```typescript
// Ogni handler memorizza il TOC restituito dall'operazione
setCachedTOCItems(result.tocItems ?? null);

// Lo SplitModal usa cachedTOCItems invece di chiamare getOutline()
if (cachedTOCItems && cachedTOCItems.length > 0) {
    setTocItemsForSplit(cachedTOCItems);  // bypass pdfjs-dist
} else {
    getOutline(pdf).then(...);
}

// Merge e caricamento nuovo file resettano il cache
setCachedTOCItems(null);
```

### Limitazioni note dell'outline

| Problema | Stato | Dettaglio |
|----------|:-----:|-----------|
| **writeOutline ↔ pdfjs-dist incompatibilità** | 🔧 Workaround | `writeOutline()` usa `context.obj([pageRef, ...])` che crea oggetti indiretti; `pdfjs-dist getOutline()` non li risolve → `pageNumber: null`. **Fix**: il TOC viene passato via `cachedTOCItems` invece di ri-estrarlo dal PDF modificato ([vedi sezione Caching](#caching-toc-tra-operazioni)). Senza questo workaround, i test 10.2-10.6 fallirebbero con "0 files" nel preview TOC. |
| **Merge non preserva TOC** | ❌ | Il TOC dei PDF sorgente non viene unito |
| **Insert/Replace fonte esterna** | ⚠️ | Il TOC del PDF sorgente NON viene incorporato; solo il TOC del PDF target viene rinumerato |
| **TOC di PDF senza outline** | ✅ | `tocItems` è `undefined` o `[]` → nessun side effect |

---

## 🧪 Test Suite Completa

### 1. Test E2E Playwright — `tests/full-suite.spec.ts`

**83 test case** distribuiti su 10 sezioni. La suite è cresciuta da 77 (TEST_PLAN.md originale) a 83 con l'aggiunta della sezione 10 TOC Preservation.

| Sez. | Tool | Test | PDF | Note |
|:----:|------|:----:|-----|------|
| 1 | Extract | 11 | Internazionale (A) | All, Current, Selected, Custom, Odd/Even, Delete After, Edge cases |
| 2 | Insert / Replace | 12 | A + Venerdì (B) | Insert/Replace toggle, Custom ranges, Source/Target, Edge cases |
| 3 | Delete | 7 | A | Current, Selected, Custom, Odd/Even, Cannot Delete All, Warning |
| 4 | Copy / Move | 9 | A | Copy/Move toggle, Copies, Destination, Edge cases |
| 5 | Rotate | 6 | A | 90°CW, 180°, 90°CCW, Current, Selected, Edge cases |
| 6 | Reverse | 6 | A | All, Selected, Custom, 1-page, Preview, Edge cases |
| 7 | Split | 12 | A | Ogni N, N file, Markers, Custom ranges, 1pp, TOC Level 1, TOC tree |
| 8 | Merge | 7 | A+B+C | 2/3 PDF, Up/Down buttons, Drag & Drop, Edge cases |
| 9 | Reorder | 7 | A | Enter, Quick Swap, Same page, Out of range, Cancel restore, Reset |
| 10 | **TOC Preservation** | **6** | **Harrison (H)** | **Delete/Rotate/Reverse/Move + TOC, Full cycle** |

### 2. Sezione 10 — TOC Preservation (dettaglio)

PDF di test: **Harrison 2025 _ 22nd Edition.pdf** (277 MB, 4.272 pagine, 591 bookmark, 4 livelli gerarchici — 20 PART, 28 Chapter, 591 foglie)

| # | Test | Azione | Verifica | Stato |
|---|------|--------|----------|:-----:|
| **10.1** | Delete + TOC Panel | Cancella pagina 5 → apri TOC Panel | Bookmark rinumerati, PART 1 ancora navigabile, ≥15 PART items visibili | ✅ |
| **10.2** | Delete + Split TOC | Cancella Front Matter (p.1) → Split by TOC Top Level | File count ragionevole (15-30), preview corretta | ✅ |
| **10.3** | Rotate + TOC Tree | Ruota pp.3-5 180° → Split by TOC, seleziona PART 1 nell'albero | PART 1 evidenziato (bordo verde), Top Level → N files | ✅ |
| **10.4** | Reverse + TOC navigation | Reverse totale → apri TOC Panel, naviga PART 1 | ≥15 PART items, navigazione funzionante | ✅ |
| **10.5** | Move + Split preview | Sposta pp.50-55 dopo p.100 → Split by TOC Top Level | Preview con range `pp.` corretti, file count valido (18-30) | ✅ |
| **10.6** | **Full cycle** | Delete p.5 → Rotate all 90°CW → Reverse pp.10-20 → Split TOC | TOC funzionale dopo 3 operazioni consecutive, ≥15 PART items | ✅ |

> **Perché questi test passano**: Il meccanismo `cachedTOCItems` in `App.tsx` memorizza i TOC items restituiti da ogni operazione e li passa direttamente allo SplitModal, **bypassando** `pdfjs-dist getOutline()`. Questo evita il bug di compatibilità tra `writeOutline()` (pdf-lib low-level) e `getOutline()` (pdfjs-dist), che causerebbe `pageNumber: null` su tutti i bookmark. Vedi sezione [Caching TOC](#caching-toc-tra-operazioni) per i dettagli.

**Tutti i 6 test passano** ✅

### 3. Test Split by TOC

Due test aggiuntivi nella sezione 7 verificano lo Split by TOC su PDF fresco:

| # | Test | Azione | Verifica | Stato |
|---|------|--------|----------|:-----:|
| **7.TOC** | Split by TOC Level 1 | Harrison fresco → Split → By TOC → Top Level | Esegui split, verifica download ZIP `-split.zip`, file count 18-30 | ✅ |
| **7.TOC-tree** | TOC tree selection | Harrison fresco → Split → By TOC → clicca PART 1 nell'albero | PART 1 evidenziato, Top Level → N files, esegui split, ZIP scaricato | ✅ |

### 4. Smoke test — Playwright (57 test)

`tests/smoke.spec.ts` — 12 sezioni che coprono tutte le API Playwright:

| Sez. | Area | Test |
|:----:|------|:----:|
| 1 | Navigazione e Caricamento | 6 |
| 2 | Locator (CSS, testo, ruolo, label) | 7 |
| 3 | Interazioni (click, hover, focus, keyboard) | 7 |
| 4 | Screenshot e Viewport | 4 |
| 5 | Network (intercettazione, mock, route) | 5 |
| 6 | Browser Context (isolamento, cookie, geoloc) | 3 |
| 7 | Console e Dialog (alert, confirm, warn) | 6 |
| 8 | Storage (localStorage, sessionStorage, cookie) | 4 |
| 9 | Emulazione (mobile, dark mode, user agent) | 4 |
| 10 | Performance e Timing | 3 |
| 11 | API JS (evaluate, $eval, $$eval, waitForFunction) | 6 |
| 12 | Accessibilità | 2 (⏭️ skipped in headless) |

### 5. Smoke test — Puppeteer (18/18)

`tests/puppeteer-smoke.mjs` — 8 sezioni:

| Sez. | Area | Test |
|:----:|------|:----:|
| 1 | Avvio browser headless | 2 |
| 2 | Creazione pagina | 2 |
| 3 | Navigazione HTTP | 3 |
| 4 | Contenuto e titolo | 3 |
| 5 | Screenshot | 2 |
| 6 | Intercettazione richieste | 2 |
| 7 | Valutazione JavaScript | 3 |
| 8 | Cookie e LocalStorage | 2 |

### 6. Smoke test — Chrome DevTools Protocol (34/34)

`tests/devtools-smoke.mjs` — 11 sezioni:

| Sez. | Dominio CDP | Test |
|:----:|-------------|:----:|
| Setup | Browser + CDP Session | 2 |
| 1 | `DOM.getDocument` | 3 |
| 2 | `DOM.querySelector` | 2 |
| 3 | `Runtime.evaluate` | 4 |
| 4 | `Network.enable` + intercettazione | 2 |
| 5 | `Page.captureScreenshot` | 3 |
| 6 | `Page.getNavigationHistory` | 3 |
| 7 | `Page.getLayoutMetrics` | 5 |
| 8 | `Runtime.getProperties` | 3 |
| 9 | `Emulation.setDeviceMetricsOverride` | 3 |
| 10 | `Runtime.consoleAPICalled` | 2 |
| 11 | `Page.navigate` + `loadEventFired` | 3 |

### 7. Test unitario outline — `scripts/test_outline.mjs`

Test standalone Node.js che verifica l'intero flusso writeOutline:

```
1. Carica Harrison 2025 (pdfjs-dist + pdf-lib)
2. Estrai outline (591 bookmark)
3. Simula delete pagina 5
4. Calcola mapping (computeDeletePageMapping)
5. Aggiorna outline (updateTOCAfterDelete)
6. Scrivi outline nel nuovo PDF (writeOutline)
7. Salva e verifica: rileggi con pdfjs-dist
8. Output: bookmark preserved (591→590, -1 per pagina cancellata)
```

---

## 🔧 Stack Tecnico

| Categoria | Libreria | Versione |
|-----------|----------|:--------:|
| Framework | React | 19.2 |
| Bundler | Vite | 8.0 |
| Linguaggio | TypeScript | 6.0 |
| CSS | Tailwind CSS | 4.3 |
| Rendering PDF | pdfjs-dist | 6.0 |
| Manipolazione PDF | pdf-lib | 1.17 |
| Virtual scroll | @tanstack/react-virtual | 3.14 |
| Compressione | JSZip | 3.10 |
| Crittografia | Web Crypto API | Native |
| Test E2E | @playwright/test | 1.61 |
| Test browser | puppeteer | 25.2 |
| Test CDP | devtools-protocol | 0.0.1638949 |

---

## 📝 Comandi Rapidi

```bash
# Typecheck
npx tsc --noEmit

# Build produzione
npx vite build

# Test E2E completi
npx playwright test tests/full-suite.spec.ts --timeout=600000

# Solo TOC Preservation
npx playwright test tests/full-suite.spec.ts -g "10. TOC"

# Smoke test
npx playwright test tests/smoke.spec.ts --reporter=list
node tests/puppeteer-smoke.mjs
node tests/devtools-smoke.mjs

# Test outline unitario
node scripts/test_outline.mjs
```

---

## 🔜 Prossimi Passi

| # | Task | Priorità |
|---|------|:--------:|
| 1 | **Page Filter in SplitModal** (RangeSelector per filtrare pagine) | 🟡 Media |
| 2 | **Progress bar per TOC split** (100+ file) | 🟡 Media |
| 3 | **Toast feedback** per doc tool istantanei | 🟢 Bassa |
| 4 | **Undo/Redo** con cronologia buffer | 🔵 Futura |
| 5 | **Dark/Light theme** toggle | 🔵 Futura |
| 6 | **Fix writeOutline ↔ pdfjs-dist** per scrivere destinazioni compatibili con getOutline() | 🔴 Importante |

---

## ⚠️ Limitazioni Note

| Feature | Stato | Motivazione |
|---------|:-----:|-------------|
| writeOutline ↔ pdfjs-dist compatibilità | 🔧 Workaround | `context.obj()` crea oggetti indiretti non risolti da pdfjs-dist |
| Compressione PDF reale | ❌ | Richiede WASM o Ghostscript server-side |
| Crittografia PDF standard | ❌ | pdf-lib non supporta `setEncryption` |
| PDF/A conversione | ❌ | Motori server-side necessari |
| Watermarking SVG | ❌ | pdf-lib supporta solo PNG/JPG |
| Merge: unione TOC da più PDF | ❌ | Non implementato |

---

**Stato complessivo**: ✅ v3.2 — **19 tool**, **architettura non-distruttiva**, **TOC preservato in 7/7 operazioni in-place**, **83 test E2E**, **57 smoke test Playwright**, **18 Puppeteer**, **34 DevTools CDP**, typecheck 0 errori.
