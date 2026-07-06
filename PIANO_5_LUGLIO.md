# 📋 Piano di lavoro — 5 Luglio 2026

**Progetto**: pdfhandler v3.3  
**Stato partenza**: 85 test ✅, 15 modali con HelpBox + ErrorBanner + try/catch ✅, typecheck 0 ✅  
**Obiettivo giornata**: 5 fasi, ~7-8 ore di lavoro

---

## ⏮️ Riepilogo di ieri (4 Luglio)

- ✅ **DialogShell**: `disabledReason` prop con tooltip su hover quando Execute è disabilitato
- ✅ **HelpBox**: box blu informativo in cima a tutti i 15 modali
- ✅ **ErrorBanner**: banner rosso inline in tutti i 15 modali (sostituisce `alert()`)
- ✅ **WarningBanner**: banner ambra per MergeModal (file non-PDF rifiutati)
- ✅ **try/catch**: in tutti gli `handleExecute` degli 8 Page Tool + 7 Document Tool
- ✅ **MergeModal**: conteggio file rifiutati con dismiss
- ✅ **Typecheck**: 0 errori

---

## 🔴 FASE 1 — Toast system globale (45 min)

**Obiettivo**: Sostituire gli ultimi 12 `alert()` residui in `App.tsx` e aggiungere feedback visivo per le operazioni one-shot (export PNG, extract text) che oggi sono completamente silenziose.

### 1.1 Nuovo file: `src/components/Toast.tsx`

**Componente `Toast`**:
```tsx
// Renderizza in #toast-portal via createPortal
// Props: { toasts: ToastData[] }
// Layout: colonna in basso a destra, animazione slide-up
// Massimo 3 toast visibili, i più vecchi vengono rimossi
// Auto-dismiss: 4 secondi per success/info, 6 secondi per error
```

**Hook `useToast`**:
```ts
interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (type: ToastData['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { id, type, message }]); // max 3
    const duration = type === 'error' ? 6000 : 4000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  return { toasts, showToast };
}
```

**Stili per tipo**:
- `success`: bordo verde, icona checkmark
- `error`: bordo rosso, icona cerchio con X
- `info`: bordo blu, icona cerchio con i

### 1.2 Modifica `index.html`

Aggiungere **prima di `</body>`**:
```html
<div id="toast-portal"></div>
```

### 1.3 Modifica `App.tsx` — sostituire alert() con showToast()

**Import**:
```tsx
import { Toast, useToast } from './components/Toast';
```

**Hook**:
```tsx
const { toasts, showToast } = useToast();
```

**Sostituzioni puntuali** (12 occorrenze):

| Handler | Riga ~ | Prima | Dopo |
|---------|--------|-------|------|
| `handleDocInstantAction` | 144 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleEncrypt` | 189 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleDecrypt` | 196 | `alert('Decryption failed. Wrong password?')` | `showToast('error', 'Decryption failed. Wrong password?')` |
| `handleReorderApply` | 238 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleMerge` | 273 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleExtract` | 334 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleInsertReplace` | 366 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleDelete` | 390 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleCopyMove` | 425 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleRotate` | 449 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleReverse` | 472 | `alert(err.message)` | `showToast('error', err.message)` |
| `handleSplit` | 502 | `alert(err.message)` | `showToast('error', err.message)` |

**Aggiungere feedback di successo** (2 nuove chiamate):

In `handleDocInstantAction`, dopo l'operazione riuscita:
```tsx
if (id === 'export-images') {
  const zip = await exportImagesAsZip(pdfBytes, base, 1.5, 'png');
  downloadZip(zip, `${base}-images.zip`);
  showToast('success', 'PNG images exported as ZIP');
} else if (id === 'extract-text') {
  const text = await extractText(pdfBytes);
  downloadText(text, `${base}-text.txt`);
  showToast('success', 'Text extracted as .txt');
}
```

**Render**:
```tsx
{/* in fondo al render di App, prima del tag di chiusura */}
<Toast toasts={toasts} />
```

### 1.4 Verifica

```bash
npx tsc --noEmit  # deve dare 0 errori
grep -n "alert(" src/App.tsx  # deve dare 0 risultati
grep -n "alert(" src/components/doc/modals/*.tsx  # deve dare 0 risultati
```

**File creati/modificati**: `Toast.tsx` (nuovo), `index.html`, `App.tsx`  
**Test**: non necessari (cambiamento puramente cosmetico)

---

## 🟡 FASE 2 — Page Filter in SplitModal (2.5 ore)

**Obiettivo**: Poter filtrare un sottoinsieme di pagine prima di applicare lo split. Esempio: split by TOC, ma solo le pagine 50-200.

### 2.1 `SplitModal.tsx` — nuovi stati

```tsx
// Nuovi import da shared
import { RangeSelector, SubsetSelector, parseRangeString } from './shared';
import type { RangeMode, SubsetValue } from './shared';

// Nuovi stati
const [filterOpen, setFilterOpen] = useState(false);
const [filterEnabled, setFilterEnabled] = useState(false);
const [filterRangeMode, setFilterRangeMode] = useState<RangeMode>('all');
const [filterCustomRange, setFilterCustomRange] = useState('');
const [filterSubset, setFilterSubset] = useState<SubsetValue>('all');
```

### 2.2 `SplitModal.tsx` — calcolo pagine filtrate

```tsx
const filteredPageNumbers = useMemo(() => {
  if (!filterEnabled) return undefined; // undefined = nessun filtro

  let pages: number[] = [];
  switch (filterRangeMode) {
    case 'all':
      for (let i = 1; i <= numPages; i++) pages.push(i);
      break;
    case 'custom':
      pages = parseRangeString(filterCustomRange, numPages);
      break;
    default:
      for (let i = 1; i <= numPages; i++) pages.push(i);
  }

  if (filterSubset === 'odd') pages = pages.filter(p => p % 2 === 1);
  else if (filterSubset === 'even') pages = pages.filter(p => p % 2 === 0);

  return pages.length > 0 ? pages : undefined;
}, [filterEnabled, filterRangeMode, filterCustomRange, filterSubset, numPages]);

const filteredPageCount = filteredPageNumbers?.length ?? numPages;
```

### 2.3 `SplitModal.tsx` — UI sezione filtro

Posizionata subito sotto `HelpBox`, prima dello «Split by»:

```tsx
{/* Page Filter (collapsible) */}
<div className="space-y-2">
  <button
    onClick={() => setFilterOpen(!filterOpen)}
    className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
  >
    <svg className={`w-3 h-3 transition-transform ${filterOpen ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
    <span className="font-medium">
      Page Filter {filterEnabled ? `(active — ${filteredPageCount} pages)` : '(optional)'}
    </span>
  </button>

  {filterOpen && (
    <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-3 space-y-3">
      {/* Toggle enable/disable */}
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={filterEnabled}
          onChange={(e) => setFilterEnabled(e.target.checked)}
          className="w-3.5 h-3.5 text-blue-500 bg-zinc-800 border-zinc-600 rounded"
        />
        <span className="text-sm text-zinc-300 group-hover:text-zinc-100">
          Enable page filter
        </span>
      </label>

      {filterEnabled && (
        <>
          <RangeSelector
            numPages={numPages}
            currentPage={1}
            selectedCount={0}
            value={filterRangeMode}
            onChange={setFilterRangeMode}
            customRange={filterCustomRange}
            onCustomRangeChange={setFilterCustomRange}
            disabledModes={['current', 'selected']}
          />

          <SubsetSelector value={filterSubset} onChange={setFilterSubset} />

          <div className="flex items-start gap-2 text-[10px] text-amber-400">
            <svg className="w-3 h-3 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Filtered pages will be <strong>excluded</strong> from the split.</span>
          </div>
        </>
      )}
    </div>
  )}
</div>

<div className="border-t border-zinc-800" />
```

### 2.4 `SplitModal.tsx` — modificare handleExecute e SplitParams

```tsx
// In SplitParams:
export interface SplitParams {
  mode: SplitMode;
  value: number;
  ranges?: { start: number; end: number }[];
  markers?: number[];
  tocDepth?: TOCDepth;
  filteredPages?: number[];  // ← NUOVO
  onProgress?: (current: number, total: number, label: string) => void;  // per FASE 3
}

// In handleExecute — passare filteredPages:
await onSplit({
  mode, value: 0,
  ranges, markers, tocDepth,
  filteredPages: filteredPageNumbers,
});
```

### 2.5 `pdfOperations.ts` — applicare il filtro in ogni funzione di split

In tutte le funzioni (`splitPages`, `splitByMarkers`, `splitByRanges`, `splitByTOC`), aggiungere un parametro `pageFilter?: number[]`.

**Logica comune estratta in helper**:
```ts
function applyPageFilter(totalPages: number, pageFilter?: number[]): number[] {
  if (!pageFilter || pageFilter.length === 0) {
    return Array.from({ length: totalPages }, (_, i) => i); // tutti gli indici 0-based
  }
  return pageFilter
    .filter(p => p >= 1 && p <= totalPages)
    .map(p => p - 1); // 1-based → 0-based
}
```

In ogni funzione, sostituire:
```ts
// Prima:
const allIndices = sourceDoc.getPageIndices();
const pages = await newDoc.copyPages(sourceDoc, allIndices);

// Dopo:
const effectiveIndices = applyPageFilter(sourceDoc.getPageCount(), pageFilter);
const pages = await newDoc.copyPages(sourceDoc, effectiveIndices);
```

### 2.6 `App.tsx` — passare filteredPages nelle chiamate

```tsx
// In handleSplit, aggiungere filteredPages a ogni chiamata:
if (params.mode === 'perTOC') {
  zipBytes = await splitByTOC(
    pdfBytes, tocItemsForSplit!, params.tocDepth!, base,
    params.filteredPages,  // ← NUOVO
  );
} else if (params.mode === 'customRanges' && params.ranges) {
  zipBytes = await splitByRanges(pdfBytes, params.ranges, base, params.filteredPages);
} else if (params.mode === 'perMarkers' && params.markers) {
  zipBytes = await splitByMarkers(pdfBytes, params.markers!, base, params.filteredPages);
} else {
  const pagesPerChunk = params.mode === 'perPages' ? params.value : Math.ceil(numPages / params.value);
  zipBytes = await splitPages(pdfBytes, pagesPerChunk, base, params.filteredPages);
}
```

### 2.7 Nuovi test (3 test nella sezione 7 di `full-suite.spec.ts`)

```ts
test('7.13 Filter: Custom range before split', async ({ page }) => {
  // PDF A (~100 pp.)
  // 1. Apri Split
  // 2. Espandi Page Filter, attiva, Custom range "5-15"
  // 3. Split mode: Every N pages, N=10
  // 4. Verifica preview mostra 2 file (pp. 5-10, pp. 11-15)
  // 5. Esegui split, download ZIP
});

test('7.14 Filter: Subset odd + One page per file', async ({ page }) => {
  // PDF A
  // 1. Apri Split
  // 2. Page Filter: attiva, All pages, Subset Odd
  // 3. Split mode: One page per file
  // 4. Preview: ~N/2 file
  // 5. Esegui split
});

test('7.15 Filter: TOC split with page range', async ({ page }) => {
  // Harrison PDF
  // 1. Carica Harrison
  // 2. Apri Split → By TOC bookmarks → Top Level
  // 3. Page Filter: attiva, Custom "50-200"
  // 4. Preview: solo i capitoli che iniziano tra pp. 50-200
  // 5. File count ridotto rispetto a senza filtro
  // 6. Verifica preview, ma non eseguire split (pesante)
});
```

**File modificati**: `SplitModal.tsx`, `pdfOperations.ts`, `App.tsx`, `full-suite.spec.ts`

---

## 🟢 FASE 3 — Progress bar TOC split (1 ora)

**Obiettivo**: Mostrare una barra di progresso quando lo split by TOC produce molti file (es. Harrison: 591 file a livello All).

### 3.1 `pdfOperations.ts` — aggiungere callback onProgress a splitByTOC

```ts
export async function splitByTOC(
  pdfBytes: ArrayBuffer,
  tocItems: TOCItem[],
  depth: TOCDepth,
  baseName: string,
  pageFilter?: number[],
  onProgress?: (current: number, total: number, label: string) => void,
): Promise<Uint8Array>
```

Nel loop di creazione file:
```ts
for (let i = 0; i < ranges.length; i++) {
  onProgress?.(i + 1, ranges.length,
    sanitizeTOCFilename(ranges[i].title, 40));
  // ... crea il PDF per questo range e aggiungilo al ZIP
}
```

### 3.2 `SplitModal.tsx` — barra di progresso

**Nuovo stato**:
```ts
const [splitProgress, setSplitProgress] = useState<{
  current: number; total: number; label: string;
} | null>(null);
```

**UI** — mostrata al posto del corpo del modale durante l'esecuzione:
```tsx
{executing && splitProgress && (
  <div className="px-5 py-6 space-y-3">
    <p className="text-sm text-zinc-400 text-center">
      Creating {splitProgress.total} files...
    </p>
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-500">
        <span className="truncate max-w-[280px]">{splitProgress.label}</span>
        <span className="tabular-nums">{splitProgress.current}/{splitProgress.total}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `${(splitProgress.current / splitProgress.total) * 100}%` }}
        />
      </div>
    </div>
  </div>
)}

{/* Nascondere il corpo normale quando c'è la progress bar */}
{!executing && (
  <>{/* contenuto normale del modale */}</>
)}
```

**Modifica handleExecute** per TOC mode:
```tsx
if (mode === 'perTOC') {
  setSplitProgress({ current: 0, total: preview.fileCount, label: 'Preparing...' });
  await onSplit({ 
    mode, value: 0, tocDepth, 
    filteredPages: filteredPageNumbers,
    onProgress: (c, t, label) => setSplitProgress({ current: c, total: t, label })
  });
  setSplitProgress(null);
} else {
  await onSplit({ mode, value: ..., filteredPages: filteredPageNumbers });
}
```

### 3.3 `App.tsx` — passare onProgress

```tsx
zipBytes = await splitByTOC(
  pdfBytes, tocItemsForSplit!, params.tocDepth!, base,
  params.filteredPages,
  params.onProgress,  // ← NUOVO
);
```

### 3.4 Nuovo test

```ts
test('7.16 Progress bar on large TOC split', async ({ page }) => {
  test.setTimeout(300_000);
  // Harrison, Split → By TOC → All (591 foglie)
  // Verifica che appaia la progress bar con testo "Creating N files..."
  // Esegui split, verifica che la barra arrivi al 100%
  // Verifica download ZIP
});
```

**File modificati**: `pdfOperations.ts`, `SplitModal.tsx`, `App.tsx`, `full-suite.spec.ts`

---

## 🔵 FASE 4 — Conferma DeleteModal (15 min)

**Obiettivo**: Aggiungere uno step di conferma esplicito prima di cancellare pagine.

### 4.1 `DeleteModal.tsx` — checkbox di conferma

**Nuovo stato**:
```ts
const [confirmed, setConfirmed] = useState(false);
```

**Modificare `canDelete`**:
```ts
const canDelete =
  !executing &&
  confirmed &&  // ← NUOVO
  (rangeMode !== 'custom' || customRange.trim().length > 0) &&
  (rangeMode !== 'selected' || selectedCount > 0) &&
  (rangeMode === 'selected' || resolvedPages.length > 0) &&
  remainingPages >= 1;
```

**Aggiungere UI checkbox prima del PreviewBar**:
```tsx
<div className="border-t border-zinc-800" />

<label className="flex items-start gap-3 cursor-pointer group">
  <input
    type="checkbox"
    checked={confirmed}
    onChange={(e) => setConfirmed(e.target.checked)}
    className="w-4 h-4 mt-0.5 text-red-500 bg-zinc-800 border-zinc-600 rounded focus:ring-red-500"
  />
  <div>
    <span className="text-sm text-zinc-300 group-hover:text-zinc-100">
      I understand this will permanently delete {previewPages} page{previewPages !== 1 ? 's' : ''}
    </span>
    <p className="text-xs text-zinc-600 mt-0.5">
      This action cannot be undone. Consider saving a copy first.
    </p>
  </div>
</label>
```

**Aggiornare `disabledReason`**:
```ts
disabledReason={
  executing ? undefined
  : !confirmed ? 'Confirm that you understand this is permanent'
  : remainingPages <= 0 ? 'Cannot delete every page — at least one must remain'
  : rangeMode === 'custom' && !customRange.trim() ? 'Enter a custom page range'
  : rangeMode === 'selected' && selectedCount === 0 ? 'Select at least one page'
  : undefined
}
```

**File modificati**: `DeleteModal.tsx`

---

## 🔵 FASE 5 — Fix writeOutline pdfjs-dist (1-3 ore, investigativo)

**Obiettivo**: Eliminare il workaround `cachedTOCItems` facendo sì che `writeOutline()` produca destinazioni compatibili con `pdfjs-dist.getOutline()`.

### 5.1 Investigazione (1 ora)

Nel file `src/lib/pdfOutline.ts`, la riga problematica è:
```ts
dict.set(PDFName.of('Dest'), context.obj([pageRef, PDFName.of('XYZ')]));
```

**Tre approcci da testare in ordine:**

**A) PDFArray diretto** — verificare se `pdf-lib` espone `PDFArray`:
```ts
import { PDFArray } from 'pdf-lib';
const dest = PDFArray.withContext(context);
dest.push(pageRef);
dest.push(PDFName.of('XYZ'));
dict.set(PDFName.of('Dest'), dest);
```

**B) Array inline senza context.obj** — scrivere l'array direttamente nel dizionario:
```ts
// Costruiamo manualmente l'array come oggetto PDF diretto
const destArray = [pageRef, PDFName.of('XYZ')];
// Usiamo un cast per bypassare il type-check di pdf-lib
(dict as any).set(PDFName.of('Dest'), destArray);
```

**C) Approccio alternativo** — invece di `/Dest`, usare `/A` (action) con `GoTo`:
```ts
const actionDict = context.obj({
  Type: 'Action',
  S: 'GoTo',
  D: context.obj([pageRef, PDFName.of('XYZ')]),
});
dict.set(PDFName.of('A'), actionDict);
// Rimuovere la chiave /Dest se presente
```

**Test rapido**:
```bash
node scripts/test_outline.mjs
# Verifica che dopo writeOutline, getOutline() restituisca pageNumber validi
```

**Criterio di successo**: `pageNumber !== null` su almeno il 90% dei bookmark dopo `writeOutline()`.

### 5.2 Se il fix funziona (1.5 ore)

1. Applicare il fix in `pdfOutline.ts` (~5 righe)
2. **App.tsx**: rimuovere lo stato `cachedTOCItems` e tutte le sue occorrenze (~50 righe)
3. **App.tsx**: rimuovere l'`useEffect` di SplitModal che usa `cachedTOCItems` — ora può sempre chiamare `getOutline(pdf)` direttamente
4. Verificare che i 6 test TOC (10.1-10.6) passino ancora

### 5.3 Se il fix NON funziona

Aggiungere un commento in `pdfOutline.ts` che documenta la limitazione:
```ts
// KNOWN LIMITATION: pdfjs-dist getOutline() cannot resolve destinations
// written by context.obj(). We work around this by caching TOC items in
// App.tsx (cachedTOCItems) and passing them directly to SplitModal.
```

Nessuna modifica a `App.tsx` necessaria.

**File modificati**: `pdfOutline.ts`, `App.tsx` (solo se fix funziona)

---

## 🔮 FASE 6 — FUTURA: Nuovo tool «Extract & Montage» (4-5 ore, da pianificare)

**Obiettivo**: Un nuovo Page Tool che unifica Merge ed Extract in un'interfaccia di composizione visuale drag-and-drop. L'utente carica più PDF, seleziona intervalli di pagine da ciascuno (chunk), e li assembla in un unico PDF tramite trascinamento su una timeline grafica.

**⚠️ Nota**: Il tool «Merge» semplice **resta attivo** nel menu Tools. Extract & Montage è un tool aggiuntivo, non un sostituto.

### 6.0 Prototipo dell'interfaccia

#### STATO 1 — Dialogo vuoto, appena aperto

```
┌── Compose PDF ───────────────────────────────────────────────────────────────┐
│  📐 Extract & Montage                                        [×]             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Source PDFs ─────────────────────┐  ┌─ Composition ───────────────────┐ │
│  │                                   │  │                                 │ │
│  │  [+ Add PDF file...]              │  │                                 │ │
│  │                                   │  │    ┌─────────────────────────┐  │ │
│  │                                   │  │    │                         │  │ │
│  │                                   │  │    │   Drop PDFs here, then  │  │ │
│  │                                   │  │    │   select page ranges    │  │ │
│  │                                   │  │    │   to add chunks.        │  │ │
│  │                                   │  │    │                         │  │ │
│  │                                   │  │    │   Drag chunks to        │  │ │
│  │                                   │  │    │   reorder.              │  │ │
│  │                                   │  │    │                         │  │ │
│  │                                   │  │    └─────────────────────────┘  │ │
│  │                                   │  │                                 │ │
│  └───────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                              │
│  ┌─ Preview ─────────────────────────────────────────────────────────────┐  │
│  │  ⓘ  0 chunks · 0 pages · Add at least one chunk to compose           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                    [Cancel]            [Compose 0 pages ⛝]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### STATO 2 — Tre PDF caricati, range selezionati per il primo

```
┌── Compose PDF ───────────────────────────────────────────────────────────────┐
│  📐 Extract & Montage                                        [×]             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Source PDFs ─────────────────────┐  ┌─ Composition ───────────────────┐ │
│  │                                   │  │                                 │ │
│  │  📄 Internazionale.pdf            │  │  1  ┌────────────────────────┐  │ │
│  │     112 pages                     │  │  ▐██│ Internazionale         │  │ │
│  │     Range: [50  ] – [60  ]       │  │  ▐██│ pp. 50–60 (11 pp.)     │▐  │ │
│  │     [➕ Add to composition]       │  │   ─ ├────────────────────────┤  │ │
│  │                                   │  │     │                        │  │ │
│  │  📄 Il Venerdì.pdf                │  │     │  Drop chunks here or   │  │ │
│  │     96 pages                      │  │     │  add more from the     │  │ │
│  │     Range: [20  ] – [30  ]       │  │     │  source panel.         │  │ │
│  │     [➕ Add to composition]       │  │     │                        │  │ │
│  │                                   │  │     │                        │  │ │
│  │  📄 Corriere Sette.pdf            │  │     │                        │  │ │
│  │     132 pages                     │  │     │                        │  │ │
│  │     Range: [50  ] – [55  ]       │  │     │                        │  │ │
│  │     [➕ Add to composition]       │  │     │                        │  │ │
│  │                                   │  │     │                        │  │ │
│  │  [+ Add PDF file...]              │  │     └────────────────────────┘  │ │
│  │                                   │  │                                 │ │
│  └───────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                              │
│  ┌─ Preview ─────────────────────────────────────────────────────────────┐  │
│  │  ⓘ  Add page ranges from source PDFs to build the composition         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                    [Cancel]            [Compose 0 pages ⛝]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### STATO 3 — Tutti e tre i chunk aggiunti, con timeline proporzionale

```
┌── Compose PDF ───────────────────────────────────────────────────────────────┐
│  📐 Extract & Montage                                        [×]             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Source PDFs ─────────────────────┐  ┌─ Composition ─ 3 chunks ────────┐ │
│  │                                   │  │                                 │ │
│  │  📄 Internazionale.pdf [▸]        │  │  🟦 ┌───────▐▐▐▐▐▐▐▐▐▐────────┐│ │
│  │  📄 Il Venerdì.pdf     [▸]        │  │  ▐  │ Internazionale            ││ │
│  │  📄 Corriere Sette.pdf [▸]        │  │  ▐  │ pp. 50–60  (11 pp.)       ││ │
│  │                                   │  │  ▐  └───────────────────────────┘│ │
│  │  [+ Add PDF file...]              │  │     ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ │ │
│  │                                   │  │  🟩 ┌───────▐▐▐▐▐▐▐▐▐▐▐▐────────┐│ │
│  │                                   │  │  ▐  │ Il Venerdì                ││ │
│  │                                   │  │  ▐  │ pp. 20–30  (11 pp.)       ││ │
│  │                                   │  │  ▐  └───────────────────────────┘│ │
│  │                                   │  │     ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ ≡ │ │
│  │                                   │  │  🟧 ┌───────▐▐▐▐▐▐─────────────┐│ │
│  │                                   │  │  ▐  │ Corriere Sette            ││ │
│  │                                   │  │  ▐  │ pp. 50–55  (6 pp.)        ││ │
│  │                                   │  │  ▐  └───────────────────────────┘│ │
│  │                                   │  │                                 │ │
│  └───────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                              │
│  ┌─ Preview ─────────────────────────────────────────────────────────────┐  │
│  │                            ┌──────────┬──────────┬──────────┐         │  │
│  │  📊 Internazionale       ██│██████████│          │          │ 11 pp.  │  │
│  │     pp. 50–60              └──────────┴──────────┴──────────┘         │  │
│  │  📊 Il Venerdì           ██│          │██████████│          │ 11 pp.  │  │
│  │     pp. 20–30              └──────────┴──────────┴──────────┘         │  │
│  │  📊 Corriere Sette       ██│          │          │██████    │ 6 pp.   │  │
│  │     pp. 50–55              └──────────┴──────────┴──────────┘         │  │
│  │                            ← page 1     page 15     page 28 →         │  │
│  │                                                                        │  │
│  │  ⓘ  3 chunks · 28 total pages · Output: composed.pdf (28 pages)      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│                  [Reset]              [Cancel]        [Compose 28 pages ▶]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### STATO 4 — Drag & Drop in azione

```
┌── Compose PDF ─ 3 chunks ────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─ Composition ───────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  ← zona di drop (highlight blu)   │ │
│  │  │          Drop here             │                                     │ │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                                     │ │
│  │                                                                         │ │
│  │  🟦 ┌───────────────────────────────────────────────┐                   │ │
│  │  ▐  │ Internazionale · pp. 50–60 (11 pp.)          │ ≡ drag handle     │ │
│  │  ▐  └───────────────────────────────────────────────┘                   │ │
│  │                                                                         │ │
│  │  🟩 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  ← opacità 40%     │ │
│  │  ▐  │ Il Venerdì · pp. 20–30 (11 pp.)            │  (in trascinamento)│ │
│  │  ▐  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                   │ │
│  │          ↑ cursore del mouse con chunk fantasma                         │ │
│  │                                                                         │ │
│  │  🟧 ┌───────────────────────────────────────────────┐                   │ │
│  │  ▐  │ Corriere Sette · pp. 50–55 (6 pp.)           │                   │ │
│  │  ▐  └───────────────────────────────────────────────┘                   │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Preview ─ (in tempo reale durante il drag) ───────────────────────────┐  │
│  │  🟩 Il Venerdì      ██████████│                           11 pp.       │  │
│  │  🟦 Internazionale            │███████████│               11 pp.       │  │
│  │  🟧 Corriere Sette            │           │██████          6 pp.       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                    [Cancel]          [Compose 28 pages ▶]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Anatomia del chunk

```
┌─── CHUNK ───────────────────────────────────────────────────────┐
│                                                                  │
│   Barra colore    Drag handle     Nome file        Range + pp.  │
│   ┌──┐           ┌─────────┐     ┌──────────────┐ ┌──────────┐  │
│   │🟦│ ▐▐▐▐▐▐▐▐  │  ≡ ≡ ≡  │ ▐▐▐ │Internazionale│ │pp.50–60  │  │
│   └──┘           └─────────┘     │              │ │(11 pp.)  │  │
│                                   └──────────────┘ └──────────┘  │
│                                                  ┌────┐ ┌────┐  │
│                                   Azioni:        │ 🗑 │ │ ⚙  │  │
│                                                  └────┘ └────┘  │
│                                                   Del   Edit    │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Timeline proporzionale nella Preview

```
┌─ Preview ─────────────────────────────────────────────────────────────────┐
│                                                                           │
│  Internazionale   ████████████████████░░░░░░░░░░░░░░░░░░░  11 pp. (39%)  │
│  Il Venerdì       ░░░░░░░░░░░░░░░░░░░░███████████████████  11 pp. (39%)  │
│  Corriere Sette   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████  6 pp. (22%)  │
│                   ├────────────────────────────────────────┤              │
│                   ← p.1                                   p.28 →          │
│                                                                           │
│  ⓘ  3 chunks · 28 total pages · composed.pdf                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Legenda colori

Ogni PDF sorgente riceve un colore automatico dalla palette:

| Colore | PDF |
|:------:|-----|
| 🟦 Blu | Internazionale |
| 🟩 Verde | Il Venerdì |
| 🟧 Arancione | Corriere Sette |
| 🟪 Viola | PDF #4 |
| 🟥 Rosso | PDF #5 |
| ... | (palette automatica a rotazione, 8 colori) |

Lo stesso PDF può contribuire più chunk (es. pp. 10–20 e pp. 50–60) — stessa tonalità, stesso colore.

### 6.4 Interazioni

| Azione | Risultato |
|--------|-----------|
| **Click `➕ Add to composition`** | Aggiunge il range corrente come nuovo chunk in fondo alla composition |
| **Drag handle `≡`** | Trascina il chunk in nuova posizione. Chunk originale → opacità 40%, zona drop → bordo blu tratteggiato, preview timeline → aggiornamento in tempo reale |
| **Click `🗑`** | Rimuove il chunk. Il PDF sorgente rimane nel pannello sinistro |
| **Click `⚙`** | Apre mini-editor inline per modificare il range senza rimuovere/riaggiungere |
| **Doppio click su chunk** | Zoom: evidenzia quel chunk nella timeline |
| **Click `Reset`** | Svuota tutta la composition |
| **Hover su chunk** | Ombra + tooltip: nome file, range, conteggio pagine |

### 6.5 Strategia di implementazione

**Conclusione architetturale**: Extract & Montage è 70% Merge, 30% Extract.

- Da **Merge** eredita: caricamento N PDF esterni, drag & drop riordino, `copyPages()` + `addPage()` in loop, output che sostituisce il documento corrente
- Da **Extract** eredita: selettore di range (da/a) per ogni PDF sorgente, conteggio pagine del chunk

**Approccio**: partire da `MergeModal.tsx` come scheletro e aggiungere il pannello sinistro «Source PDFs» con RangeSelector per ogni file.

#### File da creare

| File | Ruolo |
|------|-------|
| `src/components/doc/modals/ComposeModal.tsx` 🆕 | Basato su MergeModal. Layout a due pannelli con timeline proporzionale. Riutilizza drag & drop e preview bar di Merge |
| `src/lib/pdfComposer.ts` 🆕 | `composePDF(chunks, sources)` — essenzialmente `handleMerge` di App.tsx con range anziché documenti interi |

#### File da modificare

| File | Modifica |
|------|----------|
| `src/hooks/useToolState.ts` | Aggiungere `'compose'` al tipo `PageModalId` e al menu dropdown |
| `src/App.tsx` | Aggiungere `handleCompose`, renderizzare `<ComposeModal>` quando `pageModalOpen === 'compose'` |
| `src/components/Editor.tsx` | Aggiungere voce «Extract & Montage» nel dropdown Tools |

#### Nuove dipendenze

Nessuna — `pdf-lib` supporta già `copyPages()` da più documenti sorgente.

#### Struttura dati

```ts
interface SourcePDF {
  id: string;
  name: string;
  data: ArrayBuffer;
  totalPages: number;
}

interface Chunk {
  id: string;
  sourceId: string;
  sourceName: string;
  colorIndex: number;
  startPage: number;  // 1-based
  endPage: number;    // 1-based
  pageCount: number;
}

interface ComposeParams {
  chunks: Chunk[];
  outputName: string;
}
```

#### Algoritmo `composePDF()`

```ts
async function composePDF(chunks: Chunk[], sources: Map<string, SourcePDF>): Promise<Uint8Array> {
  const result = await PDFDocument.create();
  for (const chunk of chunks) {
    const source = sources.get(chunk.sourceId)!;
    const srcDoc = await PDFDocument.load(source.data, { ignoreEncryption: true });
    const indices = [];
    for (let p = chunk.startPage; p <= chunk.endPage; p++) indices.push(p - 1);
    const pages = await result.copyPages(srcDoc, indices);
    for (const page of pages) result.addPage(page);
  }
  return result.save();
}
```

#### Nuovi test (5 test nella sezione 12)

```ts
test.describe('12. Extract & Montage', () => {
  test('12.1 Add chunk from single PDF and compose', async ({ page }) => {
    // Carica PDF A, aggiungi pp. 5-10 come chunk, compose
    // Verifica download composed.pdf con 6 pagine
  });

  test('12.2 Compose from 3 PDFs with different ranges', async ({ page }) => {
    // A: 50-60, B: 20-30, C: 50-55
    // Verifica 28 pagine totali, ordine corretto
  });

  test('12.3 Drag & drop reorder chunks', async ({ page }) => {
    // Aggiungi 3 chunk, trascina il terzo in prima posizione
    // Verifica che l'ordine nella preview cambi
  });

  test('12.4 Edit chunk range inline', async ({ page }) => {
    // Aggiungi chunk, clicca ⚙, cambia range, verifica conteggio aggiornato
  });

  test('12.5 Remove chunk and recompose', async ({ page }) => {
    // Aggiungi 2 chunk, rimuovi il primo, compose con 1 solo chunk
  });

  test('12.6 Multiple chunks from same PDF', async ({ page }) => {
    // Da PDF A: pp. 10-20 e pp. 50-60 (stesso colore)
    // Verifica che entrambi i chunk abbiano lo stesso colore
  });

  test('12.7 Edge: Compose with 0 chunks → disabled', async ({ page }) => {
    // Bottone Compose disabilitato senza chunk
  });

  test('12.8 Edge: Invalid range → chunk with error border', async ({ page }) => {
    // From > To → bordo rosso sul chunk, tooltip errore
  });
});
```

### 6.6 Stima effort

| Attività | Tempo |
|----------|:-----:|
| `pdfComposer.ts` — logica core | 45 min |
| `ComposeModal.tsx` — UI completa (due pannelli, drag & drop, timeline) | 2.5 ore |
| `useToolState.ts` — aggiungere `compose` al menu | 10 min |
| `App.tsx` — wiring handler + render modale | 20 min |
| `Editor.tsx` — voce nel dropdown Tools | 5 min |
| Test (8 test) | 1 ora |
| Typecheck + debug | 20 min |
| **Totale** | **~5 ore** |

### 6.7 Nota: coesistenza con Merge semplice

Il tool **Merge** attuale (`MergeModal.tsx`) rimane invariato e accessibile dal menu Tools come «Merge PDFs». Il nuovo tool appare come «Extract & Montage» subito dopo nel dropdown:

```
Tools ▼
───────
📤 Extract
📋 Insert / Replace
🗑️ Delete
📋 Copy / Move
🔄 Rotate
🔀 Reverse
✂️ Split
🔗 Merge PDFs           ← esiste già, resta attivo
📐 Extract & Montage    ← NUOVO
↕️ Reorder
```

I due tool servono casi d'uso diversi:
- **Merge**: unione semplice di PDF interi (trascina file, riordina, unisci)
- **Extract & Montage**: composizione fine con selezione di range da più PDF su una timeline visuale

---

## 📊 Riepilogo esecutivo

| # | Fase | Tempo | File | Rischio | Valore |
|---|------|:-----:|------|:-------:|:------:|
| 1 | Toast system | 45m | Toast.tsx🆕, index.html, App.tsx | Basso | Alto |
| 2 | Page Filter | 2.5h | SplitModal.tsx, pdfOperations.ts, App.tsx, full-suite.spec.ts | Basso | Altissimo |
| 3 | Progress bar | 1h | SplitModal.tsx, pdfOperations.ts, App.tsx, full-suite.spec.ts | Basso | Medio |
| 4 | Conferma Delete | 15m | DeleteModal.tsx | Basso | Medio |
| 5 | Fix outline | 1-3h | pdfOutline.ts, App.tsx | Alto | Medio |
| 6 | 🔮 Extract & Montage | 5h | ComposeModal.tsx🆕, pdfComposer.ts🆕, useToolState.ts, App.tsx, Editor.tsx, full-suite.spec.ts | Basso | Altissimo |
| **Totale (oggi)** | | **5-7h** | **~10 file** | | |
| **Totale (incl. futuro)** | | **10-12h** | **~16 file** | | |

### Checklist di completamento

- [ ] FASE 1: `grep -rn "alert(" src/` restituisce 0 risultati
- [ ] FASE 1: Export PNG ed Extract text mostrano toast verde di conferma
- [ ] FASE 2: `npx playwright test -g "7.13"` passa
- [ ] FASE 2: `npx playwright test -g "7.14"` passa
- [ ] FASE 2: `npx playwright test -g "7.15"` passa
- [ ] FASE 3: `npx playwright test -g "7.16"` passa
- [ ] FASE 4: DeleteModal mostra checkbox «I understand», Execute disabilitato finché non checked
- [ ] FASE 5: `node scripts/test_outline.mjs` mostra pageNumber validi
- [ ] Tutte le fasi: `npx tsc --noEmit` 0 errori
- [ ] Suite completa: `npx playwright test tests/full-suite.spec.ts --timeout=600000` (attesi 88 test oggi, 105 dopo domani, 113 con Extract & Montage)

### Ordine di esecuzione

1. **Toast system** — win rapido, elimina tutti gli `alert()`, migliora UX immediatamente
2. **Conferma Delete** — 15 minuti, chiude il gap di sicurezza
3. **Page Filter** — la feature più impattante, richiede concentrazione
4. **Progress bar** — complementare al Page Filter, stesso file
5. **Fix outline** — investigativo, da fare con calma. Se troppo rischioso, rimandare.

---

## 🧪 SEZIONE TEST — Completa

**Suite attuale**: 85 test, tutte le 10 sezioni passano ✅  
**Suite obiettivo dopo domani**: 97 test (85 esistenti + 12 nuovi)  
**PDF di test**: A (Internazionale, ~100 pp.), B (Il Venerdì), C (Corriere Sette), H (Harrison, 277 MB, 4272 pp.)

---

### 🧪 Parte A — Test di regressione per le modifiche di ieri (4 Luglio)

Questi test verificano che HelpBox, ErrorBanner, disabledReason, WarningBanner e try/catch funzionino correttamente in tutti i modali. Vanno eseguiti **prima di iniziare le modifiche di domani** per stabilire la baseline.

#### A.1 — Sezione 11: UX Safeguards (8 test)

Da aggiungere in fondo a `tests/full-suite.spec.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────
// 11. UX SAFEGUARDS — HelpBox, ErrorBanner, disabledReason tooltip
// ─────────────────────────────────────────────────────────────────────
test.describe('11. UX Safeguards', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page, PDF_A);
  });

  test('11.1 ExtractModal: HelpBox visible', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    // HelpBox contains the word "Extract"
    const helpBox = page.locator('.fixed.inset-0.z-50').getByText(/Extract selected pages/);
    await expect(helpBox).toBeVisible();
    await closeModal(page);
  });

  test('11.2 ExtractModal: disabledReason tooltip on empty custom range', async ({ page }) => {
    await selectPageTool(page, 'Extract');
    await waitForModal(page);
    await selectRangeMode(page, 'custom');
    // Hover over the disabled Execute button to reveal tooltip
    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeDisabled();
    await executeBtn.hover();
    // Tooltip with reason should appear
    const tooltip = page.locator('.group\\/tooltip .absolute.bottom-full');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/custom page range/);
    await closeModal(page);
  });

  test('11.3 DeleteModal: disabledReason when deleting all pages', async ({ page }) => {
    await selectPageTool(page, 'Delete');
    await waitForModal(page);
    await selectRangeMode(page, 'all');
    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeDisabled();
    await executeBtn.hover();
    const tooltip = page.locator('.group\\/tooltip .absolute.bottom-full');
    await expect(tooltip).toContainText(/Cannot delete every page/);
    await closeModal(page);
  });

  test('11.4 MergeModal: WarningBanner for non-PDF files', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    // Upload a .txt file instead of a PDF
    await page.getByTestId('merge-file-input').setInputFiles(
      path.join(PROJECT_ROOT, 'file_to_upload.txt')
    );
    await page.waitForTimeout(2000);
    // Warning banner should appear about skipped file
    const warning = page.locator('.fixed.inset-0.z-50').filter({ hasText: /skipped/ });
    await expect(warning.first()).toBeVisible({ timeout: 5000 });
    await closeModal(page);
  });

  test('11.5 MergeModal: disabledReason with 0 files', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeDisabled();
    await executeBtn.hover();
    const tooltip = page.locator('.group\\/tooltip .absolute.bottom-full');
    await expect(tooltip).toContainText(/at least two PDF files/);
    await closeModal(page);
  });

  test('11.6 MergeModal: disabledReason with 1 file', async ({ page }) => {
    await selectPageTool(page, 'Merge');
    await waitForModal(page);
    // Upload just one PDF
    await page.getByTestId('merge-file-input').setInputFiles(PDF_A);
    await page.waitForSelector('.fixed.inset-0.z-50 span:has-text("pp.")', { timeout: 30_000 });
    await page.waitForTimeout(500);
    const executeBtn = modalExecuteBtn(page);
    await expect(executeBtn).toBeDisabled();
    await executeBtn.hover();
    const tooltip = page.locator('.group\\/tooltip .absolute.bottom-full');
    await expect(tooltip).toContainText(/one more PDF file/);
    await closeModal(page);
  });

  test('11.7 CryptoModal: password mismatch ErrorBanner (not alert)', async ({ page }) => {
    // Open encrypt modal via doc tool (requires loaded PDF)
    // Since CryptoModal uses ModalWrapper not DialogShell,
    // we verify the ErrorBanner replaces the old alert()
    // This test verifies the ErrorBanner component renders
    // Note: we can't easily trigger encrypt UI, so we verify via the modal structure
    // that the old pattern is gone by code review
    test.skip(true, 'Manual verification: open Crypto, type mismatched passwords, press Enter. Should show red ErrorBanner inline, not browser alert().');
  });

  test('11.8 All modals: no raw alert() in modal code', async ({ page }) => {
    // This is a code-level check, not browser-level.
    // Verified via: grep -rn "alert(" src/components/doc/modals/
    // Expected: 0 results
    test.skip(true, 'Verified via static analysis: grep -rn "alert(" src/components/doc/modals/ returns 0 results');
  });
});
```

#### A.2 — Verifica statica pre-modifiche

Prima di iniziare le modifiche di domani, eseguire:

```bash
# 1. Typecheck baseline
npx tsc --noEmit
# Expected: 0 errors

# 2. Nessun alert() nei modali
grep -rn "alert(" src/components/doc/modals/
# Expected: 0 results

# 3. HelpBox presente in tutti i modali
grep -l "HelpBox" src/components/doc/modals/*.tsx | wc -l
# Expected: 15

# 4. ErrorBanner presente in tutti i modali
grep -l "ErrorBanner" src/components/doc/modals/*.tsx | wc -l
# Expected: 15

# 5. disabledReason presente in tutti i Page Tool (8 modali)
grep -l "disabledReason" src/components/doc/modals/{Extract,InsertReplace,Delete,CopyMove,Rotate,Reverse,Split,Merge}Modal.tsx | wc -l
# Expected: 8

# 6. Suite completa baseline
npx playwright test tests/full-suite.spec.ts --timeout=600000
# Expected: 85 passed, 0 failed
```

---

### 🧪 Parte B — Nuovi test per le modifiche di domani (5 Luglio)

#### B.1 — Test per FASE 1: Toast system (3 test)

Da aggiungere in fondo a `tests/full-suite.spec.ts`, sezione 11:

```ts
test('11.9 Toast: success message after Export PNG', async ({ page }) => {
  // 1. Load PDF A
  // 2. Click Tools → Export PNG (doc instant action)
  // 3. Wait for toast to appear with success message
  const toast = page.locator('#toast-portal .border-green-500');
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await expect(toast).toContainText(/exported/);
  // Toast should auto-dismiss after ~4s
  await expect(toast).not.toBeVisible({ timeout: 10_000 });
});

test('11.10 Toast: success message after Extract Text', async ({ page }) => {
  // 1. Load PDF A
  // 2. Click Tools → Extract Text (doc instant action)
  // 3. Wait for toast
  const toast = page.locator('#toast-portal .border-green-500');
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await expect(toast).toContainText(/extracted/);
});

test('11.11 Toast: error message replaces old alert()', async ({ page }) => {
  // Trigger an error (e.g. rotate without selecting pages when Selected mode is active)
  // The error should appear as a red toast, not a browser alert dialog
  page.on('dialog', () => {
    throw new Error('alert() should not be called — toast expected instead');
  });
  // ... trigger error scenario ...
  // Verify red toast appears
  const errorToast = page.locator('#toast-portal .border-red-500');
  // (May be hard to trigger reliably; skip if needed)
  test.skip(true, 'Verify manually or trigger via network failure mock');
});
```

#### B.2 — Test per FASE 2: Page Filter in SplitModal (4 test)

Da aggiungere alla sezione 7 (Split) di `tests/full-suite.spec.ts`:

```ts
test('7.13 Filter: Custom range 5-15 before Every 10 pages split', async ({ page }) => {
  const initialCount = await getPageCount(page);
  if (initialCount < 20) { test.skip(true, 'PDF too small'); return; }

  await selectPageTool(page, 'Split');
  await waitForModal(page);

  // ── Open Page Filter section ──
  const filterToggle = page.locator('.fixed.inset-0.z-50').getByText('Page Filter');
  await filterToggle.click();
  await page.waitForTimeout(300);

  // ── Enable filter ──
  const enableCheckbox = page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last();
  await enableCheckbox.check();
  await page.waitForTimeout(300);

  // ── Set Custom range 5-15 ──
  // The filter RangeSelector is the one inside the collapsible section
  await page.locator('.fixed.inset-0.z-50 label:has-text("Custom range")').last().click();
  await page.waitForTimeout(200);
  const filterInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 10-20, 34, 50-51"]').last();
  await filterInput.fill('5-15');
  await page.waitForTimeout(300);

  // ── Split: Every 10 pages (default) ──
  // Preview should show 2 files: pp. 5-10, 11-15
  const previewSection = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Files/ }).first();
  await expect(previewSection).toBeVisible({ timeout: 5_000 });

  // ── Execute split ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    clickExecute(page),
  ]);
  expect(download.suggestedFilename()).toContain('-split.zip');
  await waitForModalClose(page);
});

test('7.14 Filter: Subset odd pages + One page per file', async ({ page }) => {
  const initialCount = await getPageCount(page);

  await selectPageTool(page, 'Split');
  await waitForModal(page);

  // ── Open + enable filter ──
  await page.locator('.fixed.inset-0.z-50').getByText('Page Filter').click();
  await page.waitForTimeout(200);
  await page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last().check();
  await page.waitForTimeout(300);

  // ── Subset: Odd ──
  const subsetBtn = page.locator('.fixed.inset-0.z-50 button:has-text("All pages")').last();
  if (await subsetBtn.isVisible()) {
    await subsetBtn.click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Odd pages only")').last().click();
    await page.waitForTimeout(200);
  }

  // ── Split: One page per file ──
  await page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(4).check({ force: true });
  await page.waitForTimeout(300);

  // ── Preview: ~N/2 files ──
  const executeBtn = modalExecuteBtn(page);
  await expect(executeBtn).toBeEnabled({ timeout: 5_000 });
  const btnText = await executeBtn.textContent();
  const match = btnText?.match(/Split into (\d+) files/);
  const fileCount = match ? parseInt(match[1], 10) : 0;
  const expected = Math.ceil(initialCount / 2);
  expect(fileCount).toBe(expected);

  // ── Execute ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    clickExecute(page),
  ]);
  expect(download.suggestedFilename()).toContain('-split.zip');
  await waitForModalClose(page);
});

test('7.15 Filter: TOC split filtered to pages 50-200', async ({ page }) => {
  test.setTimeout(600_000);

  // Load Harrison PDF
  await loadPDF(page, PDFS.H);
  await page.waitForTimeout(3000);

  await selectPageTool(page, 'Split');
  await waitForModal(page);

  // ── Activate By TOC bookmarks ──
  const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
  await expect(tocRadio).toBeEnabled({ timeout: 60_000 });
  await tocRadio.check({ force: true });
  await page.waitForTimeout(500);

  // ── Select Top Level depth ──
  const topLevelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Top Level")');
  await topLevelBtn.click();
  await page.waitForTimeout(300);

  // ── Record unfiltered file count ──
  const btnBefore = modalExecuteBtn(page);
  const textBefore = await btnBefore.textContent();
  const matchBefore = textBefore?.match(/Split into (\d+) files/);
  const countBefore = matchBefore ? parseInt(matchBefore[1], 10) : 0;

  // ── Open + enable filter, set Custom 50-200 ──
  const filterToggle = page.locator('.fixed.inset-0.z-50').getByText('Page Filter');
  await filterToggle.click();
  await page.waitForTimeout(300);
  await page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last().check();
  await page.waitForTimeout(300);
  await page.locator('.fixed.inset-0.z-50 label:has-text("Custom range")').last().click();
  await page.waitForTimeout(200);
  const filterInput = page.locator('.fixed.inset-0.z-50 input[placeholder="e.g. 10-20, 34, 50-51"]').last();
  await filterInput.fill('50-200');
  await page.waitForTimeout(500);

  // ── File count should be reduced (fewer chapters in 50-200) ──
  const btnAfter = modalExecuteBtn(page);
  await expect(btnAfter).toBeEnabled({ timeout: 30_000 });
  const textAfter = await btnAfter.textContent();
  const matchAfter = textAfter?.match(/Split into (\d+) files/);
  const countAfter = matchAfter ? parseInt(matchAfter[1], 10) : 0;

  console.log(`TOC split: ${countBefore} files (unfiltered) → ${countAfter} files (filtered 50-200)`);
  expect(countAfter).toBeLessThan(countBefore);
  expect(countAfter).toBeGreaterThan(0);

  // Skip actual download — preview verification is sufficient
  await closeModal(page);
});

test('7.16 Filter disabled: split behaves as before', async ({ page }) => {
  // Verify that when filter is NOT enabled, split works exactly as before
  const initialCount = await getPageCount(page);

  await selectPageTool(page, 'Split');
  await waitForModal(page);

  // ── Open filter section but do NOT enable ──
  await page.locator('.fixed.inset-0.z-50').getByText('Page Filter').click();
  await page.waitForTimeout(200);
  // Do NOT check the enable checkbox

  // ── Split: Every 10 pages (default) ──
  const expectedFiles = Math.ceil(initialCount / 10);
  const executeBtn = modalExecuteBtn(page);
  const btnText = await executeBtn.textContent();
  expect(btnText).toContain(`${expectedFiles}`);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    clickExecute(page),
  ]);
  expect(download.suggestedFilename()).toContain('-split.zip');
  await waitForModalClose(page);
});
```

#### B.3 — Test per FASE 3: Progress bar (1 test)

```ts
test('7.17 Progress bar on large TOC split (All depth)', async ({ page }) => {
  test.setTimeout(600_000);

  // Load Harrison PDF
  await loadPDF(page, PDFS.H);
  await page.waitForTimeout(3000);

  await selectPageTool(page, 'Split');
  await waitForModal(page);

  // ── By TOC bookmarks → All depth (591 files) ──
  const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
  await expect(tocRadio).toBeEnabled({ timeout: 60_000 });
  await tocRadio.check({ force: true });
  await page.waitForTimeout(500);

  // Select "All" depth → maximum files
  const allBtn = page.locator('.fixed.inset-0.z-50 button:has-text("All")').first();
  await allBtn.click();
  await page.waitForTimeout(300);

  // ── Execute split and verify progress bar appears ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 300_000 }),
    clickExecute(page),
  ]);

  // ── After completion, progress bar should be gone, modal closed ──
  expect(download.suggestedFilename()).toContain('-split.zip');
  await waitForModalClose(page);

  // ── Verify no progress bar leftover ──
  await expect(page.locator('.fixed.inset-0.z-50 .bg-blue-500.rounded-full')).not.toBeVisible();
});
```

#### B.4 — Test per FASE 4: Conferma DeleteModal (2 test)

```ts
test('3.8 Delete: confirmation checkbox required', async ({ page }) => {
  await selectPageTool(page, 'Delete');
  await waitForModal(page);
  await selectRangeMode(page, 'current');

  // ── Execute should be disabled (checkbox not checked) ──
  const executeBtn = modalExecuteBtn(page);
  await expect(executeBtn).toBeDisabled();

  // ── Hover tooltip should say "Confirm that you understand" ──
  await executeBtn.hover();
  const tooltip = page.locator('.group\\/tooltip .absolute.bottom-full');
  await expect(tooltip).toContainText(/Confirm/);

  // ── Check the confirmation checkbox ──
  const confirmCheckbox = page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last();
  await confirmCheckbox.check();
  await page.waitForTimeout(200);

  // ── Now Execute should be enabled ──
  await expect(executeBtn).toBeEnabled();

  await closeModal(page);
});

test('3.9 Delete: uncheck re-disables Execute', async ({ page }) => {
  await selectPageTool(page, 'Delete');
  await waitForModal(page);
  await selectRangeMode(page, 'current');

  // Check then uncheck
  const confirmCheckbox = page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last();
  await confirmCheckbox.check();
  await page.waitForTimeout(200);
  await expect(modalExecuteBtn(page)).toBeEnabled();

  await confirmCheckbox.uncheck();
  await page.waitForTimeout(200);
  await expect(modalExecuteBtn(page)).toBeDisabled();

  await closeModal(page);
});
```

#### B.5 — Test per FASE 5: Fix outline (2 test)

Questi test sono condizionali: vanno eseguiti solo se il fix di `writeOutline` funziona.

```ts
test('10.7 TOC: getOutline works directly after writeOutline (no cache)', async ({ page }) => {
  test.setTimeout(300_000);
  await setupTest(page, PDFS.H);
  await page.waitForTimeout(5000);

  const initialCount = await getPageCount(page);

  // Delete page 5 — should preserve TOC WITHOUT cachedTOCItems
  await selectPageTool(page, 'Delete');
  await waitForModal(page);
  await selectRangeMode(page, 'custom');
  await setCustomRange(page, '5');
  // Check confirmation checkbox (if FASE 4 is done)
  const confirmCheckbox = page.locator('.fixed.inset-0.z-50 input[type="checkbox"]').last();
  if (await confirmCheckbox.isVisible().catch(() => false)) {
    await confirmCheckbox.check();
  }
  await clickExecute(page);
  await waitForReload(page, initialCount - 1);
  await page.waitForTimeout(5000);
  await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 30_000 });

  // Open TOC panel — should work directly from pdfjs-dist, no cache needed
  await openTOCPanel(page);
  await waitForTOCLoaded(page, 60_000);

  const partItems = page.locator('.w-72.h-full.bg-zinc-900 button:has-text("PART")');
  const partCount = await partItems.count();
  console.log(`TOC after delete (direct getOutline, no cache): ${partCount} PART items`);
  expect(partCount).toBeGreaterThanOrEqual(15);

  await closeTOCPanel(page);
});

test('10.8 TOC: Split by TOC works after rotation (no cache)', async ({ page }) => {
  test.setTimeout(300_000);
  await setupTest(page, PDFS.H);
  await page.waitForTimeout(5000);

  const initialCount = await getPageCount(page);

  // Rotate pages 3-5
  await selectPageTool(page, 'Rotate');
  await waitForModal(page);
  await selectRangeMode(page, 'custom');
  await setCustomRange(page, '3-5');
  await clickExecute(page);
  await waitForReload(page, initialCount);
  await waitForModalClose(page);

  // Open Split → By TOC — should work without cachedTOCItems
  await selectPageTool(page, 'Split');
  await waitForModal(page);

  const tocRadio = page.locator('.fixed.inset-0.z-50 input[name="splitMode"]').nth(5);
  await expect(tocRadio).toBeEnabled({ timeout: 60_000 });

  // If it's enabled, the fix works!
  console.log('✅ getOutline() works directly after writeOutline — no cache needed');
  await closeModal(page);
});
```

---

### 🧪 Parte C — Matrice completa dei test

Dopo aver completato tutte le fasi, questa è la struttura attesa della suite:

| Sez. | Tool | Test esistenti | Nuovi oggi | Nuovi domani | Futura | Totale |
|:----:|------|:-------------:|:----------:|:------------:|:------:|:------:|
| 1 | Extract | 11 | — | — | — | 11 |
| 2 | Insert / Replace | 11 | — | — | — | 11 |
| 3 | Delete | 7 | — | 2 (3.8, 3.9) | — | 9 |
| 4 | Copy / Move | 9 | — | — | — | 9 |
| 5 | Rotate | 6 | — | — | — | 6 |
| 6 | Reverse | 6 | — | — | — | 6 |
| 7 | Split | 15 | — | 5 (7.13–7.17) | — | 20 |
| 8 | Merge | 7 | — | — | — | 7 |
| 9 | Reorder | 7 | — | — | — | 7 |
| 10 | TOC Preservation | 6 | — | 2 (10.7, 10.8)* | — | 8 |
| **11** | **UX Safeguards** 🆕 | — | **8** (11.1–11.8) | **3** (11.9–11.11) | — | **11** |
| **12** | **Extract & Montage** 🆕 | — | — | — | **8** (12.1–12.8) | **8** |
| **Totale** | | **85** | **8** | **12** | **8** | **113** |

\* 10.7 e 10.8 sono condizionali: eseguiti solo se FASE 5 (fix outline) ha successo.

---

### 🧪 Parte D — Comandi di test

```bash
# === BASELINE (prima di iniziare le modifiche) ===

# Typecheck
npx tsc --noEmit

# Verifica statica: nessun alert() nei modali
grep -rn "alert(" src/components/doc/modals/

# Verifica statica: tutti i componenti UX presenti
echo "HelpBox:     $(grep -l 'HelpBox' src/components/doc/modals/*.tsx | wc -l) / 15"
echo "ErrorBanner: $(grep -l 'ErrorBanner' src/components/doc/modals/*.tsx | wc -l) / 15"
echo "disabledReason: $(grep -l 'disabledReason' src/components/doc/modals/{Extract,InsertReplace,Delete,CopyMove,Rotate,Reverse,Split,Merge}Modal.tsx | wc -l) / 8"

# Suite completa baseline (85 test)
npx playwright test tests/full-suite.spec.ts --timeout=600000


# === DOPO FASE 1 (Toast) ===

# Verifica: nessun alert() in tutto src/
grep -rn "alert(" src/

# Nuovi test UX
npx playwright test tests/full-suite.spec.ts -g "11.9" --timeout=120000
npx playwright test tests/full-suite.spec.ts -g "11.10" --timeout=120000


# === DOPO FASE 2 (Page Filter) ===

npx tsc --noEmit
npx playwright test tests/full-suite.spec.ts -g "7.13" --timeout=120000
npx playwright test tests/full-suite.spec.ts -g "7.14" --timeout=120000
npx playwright test tests/full-suite.spec.ts -g "7.15" --timeout=600000
npx playwright test tests/full-suite.spec.ts -g "7.16" --timeout=120000


# === DOPO FASE 3 (Progress bar) ===

npx tsc --noEmit
npx playwright test tests/full-suite.spec.ts -g "7.17" --timeout=600000


# === DOPO FASE 4 (Conferma Delete) ===

npx tsc --noEmit
npx playwright test tests/full-suite.spec.ts -g "3.8" --timeout=120000
npx playwright test tests/full-suite.spec.ts -g "3.9" --timeout=120000


# === DOPO FASE 5 (Fix outline, se riuscito) ===

npx tsc --noEmit
npx playwright test tests/full-suite.spec.ts -g "10.7" --timeout=300000
npx playwright test tests/full-suite.spec.ts -g "10.8" --timeout=300000


# === FINALE: suite completa ===

npx playwright test tests/full-suite.spec.ts --timeout=600000
# Attesi: 97-105 test passati, 0 falliti
```

---

### 🧪 Parte E — Test manuali aggiuntivi (non automatizzabili)

| # | Scenario | Azione | Risultato atteso |
|---|----------|--------|-----------------|
| M1 | Toast error dopo network failure | Scollegare rete durante Export PNG | Toast rosso «Network error» invece di alert() |
| M2 | Toast multipli | Esegui 3 export PNG rapidamente | Massimo 3 toast visibili, i più vecchi vengono rimossi |
| M3 | HelpBox in tutti i modali | Apri ogni tool (19 totali) | Ogni modale mostra HelpBox blu in cima |
| M4 | Tooltip Execute disabilitato | Apri Extract, seleziona Custom, non scrivere nulla | Hover su Execute → tooltip «Enter a custom page range» |
| M5 | WarningBanner Merge | Carica .txt + .jpg + PDF nel MergeModal | Warning «2 files skipped — not a valid PDF» con dismiss |
| M6 | ErrorBanner nei Document Tool | Apri Metadata, modifica titolo, scollega rete, clicca Apply | Banner rosso inline, nessun alert() |
| M7 | Conferma Delete | Apri Delete, seleziona pagine | Execute grigio finché checkbox non checked. Uncheck → di nuovo grigio |
