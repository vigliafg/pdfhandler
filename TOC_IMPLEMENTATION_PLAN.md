# Documento di Implementazione e Test — Preservazione TOC/Outline

**Versione**: 1.0  
**Data**: 30 Giugno 2026  
**PDF di test**: `Harrison 2025 _ 22nd Edition.pdf` (277 MB, 591 bookmark, 4 livelli gerarchici)

---

## 1. Stato attuale

### 1.1 Bug sistemico

**Tutte le operazioni di pagina distruggono silenziosamente l'outline/bookmark tree.**  
Causa: `pdf-lib` non espone API per l'outline. Ogni operazione crea un nuovo `PDFDocument` con `copyPages` che copia solo il contenuto visuale (testo, font, immagini) — non la struttura gerarchica dei segnalibri.

### 1.2 Funzionamento del TOC nell'app

| Layer | File | Funzione |
|---|---|---|
| Estrazione | `pdfRenderer.ts` | `getOutline(pdf)` usa pdfjs-dist `pdf.getOutline()` → `TOCItem[]` |
| Tipi | `pdfOperations.ts` | `TOCItem { title, pageNumber, children }`, `TOCDepth = 0\|1\|2\|3\|'all'` |
| Split by TOC | `SplitModal.tsx` + `splitByTOC()` | Usa `flattenTOC()` per trovare split point a una data profondità |
| TOC Panel | `TOCPanel.tsx` | Pannello laterale navigabile con `getOutline()` |

### 1.3 Prototipo già funzionante

- **`src/lib/pdfOutline.ts`** implementato e testato
- `writeOutline(doc, TOCItem[])` scrive l'outline via API low-level pdf-lib (`doc.context.obj()`, `PDFDict`, `PDFName`, `PDFRef`)
- `computeDeletePageMapping(totalPages, deletedPages)` → `Map<oldPage, newPage | null>`
- `updateTOCAfterDelete(items, mapping)` → rinumerazione/rimozione bookmark
- **Integrato in `deletePages()`** — testato con Harrison: 591→590 bookmark dopo cancellazione p.5 ✓

---

## 2. Operazioni da implementare

### 2.1 Matrice delle operazioni

| # | Operazione | Funzione | Pagine modificate | Strategia mapping |
|---|---|---|---|---|
| 1 | **Delete** | `deletePages()` | Rimosse | `computeDeletePageMapping` ✅ GIÀ FATTO |
| 2 | **Extract + Delete** | `extractPages()` + `deletePages()` | Rimosse | Stessa di Delete |
| 3 | **Rotate** | `rotatePages()` | Nessuna rimossa, solo ruotate | Mapping identità (nessuna pagina persa) |
| 4 | **Reverse** | `reversePages()` | Riordinate | `computeReorderMapping(oldOrder, newOrder)` |
| 5 | **Reorder** | `reorderPages()` | Riordinate | `computeReorderMapping(oldOrder, newOrder)` |
| 6 | **Swap** | `swapPages()` | Due pagine scambiate | `computeSwapMapping(pageA, pageB)` |
| 7 | **Copy** | `duplicatePages()` | Nuove pagine inserite | `computeInsertMapping(totalPages, copies, dest)` |
| 8 | **Move** | `movePages()` | Spostate | `computeMoveMapping(movedPages, dest)` |
| 9 | **Insert** | `insertPages()` | Nuove pagine da fonte esterna | `computeInsertMapping(totalPages, insertedPages, dest)` — ma i bookmark della fonte esterna NON vengono uniti |
| 10 | **Replace** | `replacePages()` | Sostituite (delta di pagine possibile) | `computeReplaceMapping(oldPages, newPagesCount)` |

### 2.2 Dettaglio mapping function per ogni operazione

#### 2.2.1 Delete ✅
```ts
computeDeletePageMapping(totalPages: number, deletedPages: Set<number>): Map<number, number|null>
// Es: cancello p.5 su 10 pagine → {1:1, 2:2, 3:3, 4:4, 5:null, 6:5, 7:6, 8:7, 9:8, 10:9}
```

#### 2.2.2 Reorder / Reverse / Swap
```ts
computeReorderMapping(oldOrder: number[], newOrder: number[]): Map<number, number>
// Es: reverse totale [1,2,3,4,5] → [5,4,3,2,1] → {1:5, 2:4, 3:3, 4:2, 5:1}
// Per Swap(3,7): {1:1, 2:2, 3:7, 4:4, 5:5, 6:6, 7:3, 8:8, ...}
```
**Nota**: Reverse di un subset è un caso particolare di reorder.

#### 2.2.3 Insert / Copy
```ts
computeInsertMapping(
  totalPages: number,
  insertedCount: number,
  dest: { location: 'before'|'after', page: number }
): Map<number, number>
// Es: inserisco 3 pagine dopo p.5 su 10 pagine → 
// p.1-5: invariati, p.6-10: spostati +3
```

#### 2.2.4 Move
```ts
computeMoveMapping(
  totalPages: number,
  movedPages: number[],
  dest: { location: 'before'|'after', page: number }
): Map<number, number>
// Combinazione di delete + insert logico
// 1) Rimuovi le pagine spostate (shift indietro chi sta dopo)
// 2) Inserisci alla destinazione (shift avanti chi sta dopo la dest)
```

#### 2.2.5 Replace
```ts
computeReplaceMapping(
  totalPages: number,
  replacedPages: number[],
  replacementCount: number
): Map<number, number|null>
// Le pagine sostituite vengono rimosse. Le nuove pagine dalla fonte prendono
// le posizioni delle prime pagine sostituite. Se replacementCount > replacedPages.length,
// le pagine extra vengono inserite. Se replacementCount < replacedPages.length,
// le pagine in eccesso vengono rimosse (shift).
```

#### 2.2.6 Rotate — caso speciale
```ts
// Nessuna pagina rimossa o spostata — mapping identità.
// L'outline è completamente preservato, nessuna modifica necessaria.
// Basta riscrivere lo stesso TOC invariato.
identityMapping(totalPages): Map<number, number>
```

### 2.3 Funzione generica `updateOutline`

Tutti i mapping convergono in un'unica funzione:

```ts
updateOutlineAfterMapping(
  items: TOCItem[],
  mapping: Map<number, number | null>
): TOCItem[]
```

- `pageNumber` null nella mappa → bookmark rimosso (se senza figli) o pageNumber = null (se con figli)
- `pageNumber` modificato → rinumerato
- `pageNumber` invariato → preservato

---

## 3. Architettura del codice

### 3.1 File nuovi / modificati

```
src/lib/pdfOutline.ts          ← NUOVO (writeOutline + mapping functions)
src/lib/pdfOperations.ts       ← MODIFICATO (deletePages già fatto, aggiungere tocItems alle altre)
src/App.tsx                    ← MODIFICATO (passare tocItems alle operazioni)
src/components/doc/modals/     ← NESSUNA MODIFICA (i modali non cambiano)
```

### 3.2 Nuova signature delle operazioni

Pattern uniforme: ogni operazione accetta un parametro opzionale `tocItems` e restituisce `{ bytes, tocItems? }`:

```ts
// Pattern attuale (deletePages già adottato)
async function deletePages(
  sourcePdfBytes: ArrayBuffer,
  pageNumbers: number[],
  tocItems?: TOCItem[],
): Promise<{ bytes: Uint8Array; tocItems?: TOCItem[] }>

// Da implementare nello stesso modo:
async function rotatePages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function reversePages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function reorderPages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function movePages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function duplicatePages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function insertPages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
async function replacePages(..., tocItems?: TOCItem[]): Promise<{ bytes; tocItems? }>
```

### 3.3 Flusso generico per ogni operazione

```
1. Estrai TOC originale (pdfjs-dist getOutline)  ← App.tsx
2. Chiama operazione(pdfBytes, ..., tocItems)
3. Dentro l'operazione:
   a. Ricostruisci il PDF con la nuova struttura pagine
   b. Se tocItems fornito:
      - Calcola mapping (compute*Mapping)
      - updateOutlineAfterMapping(tocItems, mapping)
      - writeOutline(newDoc, updatedTOC)
   c. Restituisci { bytes, tocItems }
4. App.tsx ricarica il PDF e opzionalmente il TOC
```

### 3.4 App.tsx — estrazione e passaggio TOC

```tsx
// Pattern da applicare a handleDelete, handleRotate, handleReverse, etc.
const handleDelete = useCallback(async (pageNumbers: number[]) => {
  if (!pdfBytes) return;
  setExecuting(true);
  try {
    const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
    if (pages.length === 0) throw new Error('No pages to delete');
    deselectAll();

    // ★ Estrai TOC prima dell'operazione
    const tocItems = pdf ? await getOutline(pdf) : undefined;

    const result = await deletePages(pdfBytes, pages, tocItems);
    await reloadPDF(result.bytes);
  } catch (err: any) { alert(err.message); }
  finally { setExecuting(false); tool.closePageModal(); }
}, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf]);
```

**Importante**: `getOutline()` è asincrono e usa pdfjs-dist. Per PDF grandi (Harrison: 277 MB) può richiedere diversi secondi. L'UI deve mostrare uno stato di loading.

---

## 4. Strategia di test

### 4.1 Test unitari (Node.js)

File: `scripts/test_outline_all_ops.mjs`

| Test | Verifica |
|---|---|
| `delete_removes_bookmarks` | Cancella p.5 di Harrison, verifica 590 bookmark (era 591) |
| `delete_renumbers_bookmarks` | Cancella p.1, verifica che il bookmark "PART 1" passi da p.2 a p.1 |
| `rotate_preserves_all` | Ruota p.3-5 di 90°, verifica stesso numero di bookmark |
| `reverse_all_preserves_count` | Reverse totale, stessa quantità di bookmark |
| `reverse_subset_renumbers` | Reverse pp.10-20, verifica bookmark dentro il range invertiti |
| `reorder_preserves_count` | Riordino completo, stessa quantità di bookmark |
| `swap_two_pages` | Swap p.3↔p.7, verifica bookmark su p.3→7 e p.7→3 |
| `copy_adds_no_bookmarks` | Copia p.5×3 dopo p.10, bookmark invariati per le originali |
| `move_renumbers` | Sposta pp.10-12 dopo p.20, verifica rinum. bookmark shifted |
| `insert_no_source_bookmarks` | Inserisci 3 pagine da altro PDF, bookmark originali invariati |
| `replace_shifts` | Sostituisci p.5-8 con 6 pagine, bookmark dopo p.8 shiftati +2 |
| `delete_then_split_toc` | Cancella p.1, apri split by TOC, verifica conteggio file aggiornato |

### 4.2 Test E2E Playwright

File: `tests/full-suite.spec.ts` — nuovo `test.describe('10. TOC Preservation')`

| # | Test | PDF | Azione | Verifica |
|---|---|---|---|---|
| 10.1 | Delete + TOC Panel | Harrison | Cancella p.5, apri TOC Panel | Bookmark rinumerati, PART 1 ancora navigabile |
| 10.2 | Delete + Split TOC | Harrison | Cancella Front Matter (p.1), Split by TOC Top Level | File count: 27 (era 28) |
| 10.3 | Rotate + TOC Tree | Harrison | Ruota p.3-5 180°, apri Split TOC tree | PART 1 ancora selezionabile, bookmark intatti |
| 10.4 | Reverse + TOC navigation | Harrison | Reverse pp.10-20, naviga TOC | Bookmark nel range invertito puntano alle pagine corrette |
| 10.5 | Move + Split preview | Harrison | Sposta pp.50-55 dopo p.100, Split by TOC | Preview corretta con pagine riordinate |
| 10.6 | Full cycle | Harrison | Delete → Rotate → Reverse → Split TOC | TOC funzionale dopo operazioni multiple |

### 4.3 Seed data

```
PDF_A = Internazionale (pdf senza bookmark)       ← edge case: operazioni su PDF senza TOC
PDF_H = Harrison 2025 (591 bookmark, 4 livelli)   ← test principale
```

---

## 5. Piano di esecuzione

### Fase 1: Completare `pdfOutline.ts` (~2 ore)
- [ ] `computeReorderMapping(oldOrder, newOrder)`
- [ ] `computeInsertMapping(totalPages, insertedCount, dest)`
- [ ] `computeMoveMapping(totalPages, movedPages, dest)`
- [ ] `computeReplaceMapping(totalPages, replacedPages, replacementCount)`
- [ ] `computeSwapMapping(pageA, pageB)`
- [ ] `identityMapping(totalPages)`

### Fase 2: Integrare in `pdfOperations.ts` (~1.5 ore)
- [ ] `rotatePages` + tocItems
- [ ] `reversePages` + tocItems
- [ ] `reorderPages` + tocItems
- [ ] `movePages` + tocItems
- [ ] `duplicatePages` + tocItems
- [ ] `insertPages` + tocItems
- [ ] `replacePages` + tocItems

### Fase 3: Wire-up in `App.tsx` (~1 ora)
- [ ] `handleDelete` — estrarre e passare TOC (aggiornare `.bytes`)
- [ ] `handleRotate` — idem
- [ ] `handleReverse` — idem
- [ ] `handleReorderApply` — idem
- [ ] `handleCopyMove` — idem (sia copy che move)
- [ ] `handleInsertReplace` — idem (sia insert che replace)
- [ ] `handleExtract` (deleteAfter) — idem

### Fase 4: Test unitari (~1 ora)
- [ ] `scripts/test_outline_all_ops.mjs` con tutti i 12 casi

### Fase 5: Test E2E Playwright (~1.5 ore)
- [ ] 6 test cases in `10. TOC Preservation` describe block
- [ ] Verifica che tutti i test passino

### Fase 6: Review e cleanup (~0.5 ore)
- [ ] Typecheck globale
- [ ] Code review delle mapping functions
- [ ] Verifica performance con Harrison (277 MB)

---

## 6. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| **pdf-lib context API instabile** | `writeOutline` già testato e funzionante. L'API low-level `context.obj()/register()` è stabile da anni |
| **Performance PDF grandi** | Harrison (277 MB) richiede ~5s per load + ~2s per writeOutline. Accettabile |
| **Bookmark con pageNumber=null** | Gestiti: ereditano dal primo figlio, o rimangono senza Dest |
| **PDF senza outline** | `tocItems` è `undefined` o `[]` — `writeOutline` esce subito, nessun side effect |
| **Operazioni annidate (es. extract+delete)** | `handleExtract` con `deleteAfter` chiama già `deletePages` — basta passare `tocItems` |

---

## 7. Note tecniche

### 7.1 pdf-lib low-level outline structure

```
/Outlines dict (root)
  /Type: /Outlines
  /First: ref → primo bookmark
  /Last: ref → ultimo bookmark
  /Count: numero totale bookmark

Ogni bookmark dict:
  /Title: (PDFString)
  /Parent: ref → nodo padre
  /Dest: [pageRef, /XYZ]
  /Next: ref → fratello successivo
  /Prev: ref → fratello precedente
  /First: ref → primo figlio (se ha children)
  /Last: ref → ultimo figlio
  /Count: numero discendenti (positivo=espanso)
```

### 7.2 Trick chiave: mutazione post-register

```ts
const ref = context.register(dict);
if (prevDict) {
  prevDict.set(PDFName.of('Next'), ref);  // ← funziona! pdf-lib non copia
}
```

### 7.3 Mapping function pattern

Tutte le mapping function restituiscono `Map<number, number | null>`:
- `oldPage` → `newPage` (1-based, rinumerata)
- `oldPage` → `null` (pagina rimossa)
- Le pagine non nella mappa sono implicitamente invariate (per operazioni parziali)

---

**Totale stimato**: ~7.5 ore di implementazione + test
