# 📋 Piano di lavoro — 6 Luglio 2026

**Progetto**: PDF Toolkit v3.4
**Stato partenza**: 85 test ✅, FASI 1-5 completate ✅, typecheck 0 ✅
**Obiettivo giornata**: Verifica completa + FASE 6 (Extract & Montage) + spostamento in cartella GitHub

---

## 📦 PARTE 0 — Verifica baseline (30 min)

Prima di toccare codice, confermare che tutto sia in ordine.

### 0.1 Typecheck

```bash
npx tsc --noEmit
# Expected: 0 errors
```

### 0.2 Verifiche statiche

```bash
# Nessun alert() residuo in tutto src/
grep -rn "alert(" src/
# Expected: 0 results

# Toast system presente
grep -l "useToast" src/App.tsx
# Expected: src/App.tsx

# HelpBox in tutti i modali (15)
grep -l "HelpBox" src/components/doc/modals/*.tsx | wc -l
# Expected: 15

# ErrorBanner in tutti i modali (15)
grep -l "ErrorBanner" src/components/doc/modals/*.tsx | wc -l
# Expected: 15

# disabledReason nei Page Tool (8)
grep -l "disabledReason" src/components/doc/modals/{Extract,InsertReplace,Delete,CopyMove,Rotate,Reverse,Split,Merge}Modal.tsx | wc -l
# Expected: 8
```

### 0.3 Suite completa tool-by-tool

Eseguire ogni sezione separatamente per isolare eventuali regressioni:

```bash
# Sezione 1 — Extract (11 test, ~60s)
npx playwright test tests/full-suite.spec.ts -g "1. Extract" --reporter=line

# Sezione 2 — Insert / Replace (12 test, ~90s)
npx playwright test tests/full-suite.spec.ts -g "2. Insert" --reporter=line

# Sezione 3 — Delete (7 test, ~45s)
npx playwright test tests/full-suite.spec.ts -g "3. Delete" --reporter=line

# Sezione 4 — Copy / Move (9 test, ~60s)
npx playwright test tests/full-suite.spec.ts -g "4. Copy" --reporter=line

# Sezione 5 — Rotate (6 test, ~45s)
npx playwright test tests/full-suite.spec.ts -g "5. Rotate" --reporter=line

# Sezione 6 — Reverse (6 test, ~45s)
npx playwright test tests/full-suite.spec.ts -g "6. Reverse" --reporter=line

# Sezione 7 — Split (14 test, ~120s)
npx playwright test tests/full-suite.spec.ts -g "7. Split" --reporter=line

# Sezione 8 — Merge (7 test, ~60s)
npx playwright test tests/full-suite.spec.ts -g "8. Merge" --reporter=line

# Sezione 9 — Reorder (7 test, ~45s)
npx playwright test tests/full-suite.spec.ts -g "9. Reorder" --reporter=line

# Sezione 10 — TOC Preservation (6 test, ~5 min — richiede Harrison PDF)
npx playwright test tests/full-suite.spec.ts -g "10. TOC" --timeout=600000 --reporter=line
```

**Expected**: 85/85 pass, 0 fail.

---

## 🔮 PARTE 1 — FASE 6: Extract & Montage (~5 ore)

**Obiettivo**: Nuovo Page Tool «Extract & Montage» — composizione visuale drag-and-drop da più PDF con selezione di range.

### 1.1 File da creare

| File | Ruolo |
|------|-------|
| `src/lib/pdfComposer.ts` 🆕 | Logica core: `composePDF(chunks, sources)` |
| `src/components/doc/modals/ComposeModal.tsx` 🆕 | UI: due pannelli (source PDFs + composition) con drag & drop e timeline |

### 1.2 File da modificare

| File | Modifica |
|------|----------|
| `src/hooks/useToolState.ts` | Aggiungere `'compose'` al tipo `PageModalId` e al menu dropdown |
| `src/App.tsx` | Aggiungere `handleCompose`, renderizzare `<ComposeModal>` |
| `src/components/Editor.tsx` | Aggiungere voce «Extract & Montage» nel dropdown Tools |
| `tests/full-suite.spec.ts` | Nuova sezione 11 con 8 test |

### 1.3 Struttura dati

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
```

### 1.4 Interfaccia utente (vedi PIANO_5_LUGLIO.md §6.0 per i mockup)

Layout a due pannelli:
- **Sinistra**: Source PDFs — file caricati con RangeSelector per ciascuno + pulsante «➕ Add to composition»
- **Destra**: Composition — timeline con chunk trascinabili (drag handle ≡), pulsanti delete (🗑) e edit (⚙)
- **Preview bar**: timeline proporzionale con barre colorate per ogni chunk, conteggio totale

### 1.5 Step di implementazione

**Step 1 — `pdfComposer.ts`** (~45 min)

```ts
async function composePDF(chunks: Chunk[], sources: Map<string, SourcePDF>): Promise<Uint8Array> {
  const result = await PDFDocument.create();
  for (const chunk of chunks) {
    const source = sources.get(chunk.sourceId)!;
    const srcDoc = await PDFDocument.load(source.data, { ignoreEncryption: true });
    const indices: number[] = [];
    for (let p = chunk.startPage; p <= chunk.endPage; p++) indices.push(p - 1);
    const pages = await result.copyPages(srcDoc, indices);
    for (const page of pages) result.addPage(page);
  }
  return result.save();
}
```

**Step 2 — `useToolState.ts`** (~10 min)

Aggiungere `'compose'` al tipo `PageModalId` e al menu dropdown in ordine:
```
Extract, Insert / Replace, Delete, Copy / Move, Rotate, Reverse, Split,
Merge PDFs, Extract & Montage, Reorder
```

**Step 3 — `Editor.tsx`** (~5 min)

Aggiungere voce nel dropdown Tools subito dopo «Merge PDFs»:
```tsx
{ icon: composeIcon, label: 'Extract & Montage', id: 'compose' as PageModalId },
```

**Step 4 — `ComposeModal.tsx`** (~2.5 ore)

Basato su `MergeModal.tsx` ma con:
- Pannello sinistro: upload multiplo PDF, RangeSelector per ciascuno, pulsante «➕ Add»
- Pannello destro: lista chunk con drag handle, delete, edit
- Preview bar con timeline proporzionale
- Palette colori automatica (8 colori a rotazione)
- `DialogShell` per header/footer

Riutilizzare componenti da `shared.tsx`: `RangeSelector`, `PreviewBar`, `HelpBox`, `ErrorBanner`.

**Step 5 — `App.tsx`** (~20 min)

```tsx
// Import
import { ComposeModal, type ComposeParams } from './components/doc/modals/ComposeModal';

// Handler
const handleCompose = useCallback(async (params: ComposeParams) => {
  if (!pdfBytes) return;
  setExecuting(true);
  try {
    const bytes = await composePDF(params.chunks, params.sources);
    const buf = (bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    deselectAll();
    setCachedTOCItems(null);
    await loadPDFFromBytes(buf, params.outputName || 'composed.pdf');
  } catch (err: any) {
    showToast('error', err.message);
  } finally {
    setExecuting(false);
    tool.closePageModal();
  }
}, [pdfBytes, executing, deselectAll, loadPDFFromBytes, tool, showToast]);

// Render
{tool.pageModalOpen === 'compose' && pdfBytes && (
  <ComposeModal
    onClose={tool.closePageModal}
    onCompose={handleCompose}
    executing={executing}
  />
)}
```

**Step 6 — Test** (~1 ora)

Nuova sezione 11 in `tests/full-suite.spec.ts` con 8 test:

| # | Test | Descrizione |
|---|------|-------------|
| 11.1 | Add chunk from single PDF and compose | Carica PDF A, aggiungi pp. 5-10, compose → 6 pagine |
| 11.2 | Compose from 3 PDFs with different ranges | A:50-60, B:20-30, C:50-55 → 28 pagine totali |
| 11.3 | Drag & drop reorder chunks | 3 chunk, trascina il terzo in prima posizione |
| 11.4 | Edit chunk range inline | ⚙ cambia range, verifica conteggio aggiornato |
| 11.5 | Remove chunk and recompose | Aggiungi 2 chunk, rimuovi il primo, compose con 1 |
| 11.6 | Multiple chunks from same PDF | Stesso PDF → stesso colore |
| 11.7 | Edge: Compose with 0 chunks → disabled | Bottone disabilitato senza chunk |
| 11.8 | Edge: Invalid range → error border | From > To → bordo rosso, tooltip errore |

**Step 7 — Typecheck + debug** (~20 min)

```bash
npx tsc --noEmit
# Fix eventuali errori prima di eseguire i test
```

---

## 🧪 PARTE 2 — Test finale completo (30 min)

Dopo FASE 6, eseguire la suite completa per confermare zero regressioni:

```bash
# Typecheck finale
npx tsc --noEmit
# Expected: 0 errors

# Tutti i test (85 esistenti + 8 nuovi = 93 test)
npx playwright test tests/full-suite.spec.ts --timeout=600000 --reporter=line
# Expected: 93 passed, 0 failed
```

Se necessario, eseguire sezione per sezione per isolare fallimenti.

---

## 📁 PARTE 3 — Spostamento in cartella GitHub (15 min)

### 3.1 Preparazione

```bash
# 1. Copiare TUTTI i file del progetto nella cartella GitHub
#    (escludere node_modules, test-results, playwright-report)
GITHUB_DIR="/home/vigliafg/Documenti/pdfhandler-github"  # da confermare col percorso esatto

rsync -av --exclude 'node_modules' --exclude 'test-results' --exclude 'playwright-report' \
  /home/vigliafg/Documenti/pdfhandler/ $GITHUB_DIR/
```

### 3.2 Verifica nella cartella GitHub

```bash
cd $GITHUB_DIR
npm install
npx tsc --noEmit
# Expected: 0 errors
```

### 3.3 File da NON copiare (pattern .gitignore)

```
node_modules/
test-results/
playwright-report/
*.pdf.enc
```

### 3.4 Commit e push

> **Nota**: Le operazioni git (`git add`, `git commit`, `git push`) le farà l'utente manualmente.

File pronti per il commit:
- Tutti i file `.ts`/`.tsx` modificati e nuovi
- `package.json`, `package-lock.json` (se nuove dipendenze)
- `index.html`
- `PIANO_5_LUGLIO.md`, `PIANO_6_LUGLIO.md`

---

## 📊 Riepilogo temporale

| # | Attività | Tempo |
|---|----------|:-----:|
| 0.1 | Typecheck baseline | 2 min |
| 0.2 | Verifiche statiche | 3 min |
| 0.3 | Suite test tool-by-tool | 10 min |
| 1.1 | `pdfComposer.ts` | 45 min |
| 1.2 | `useToolState.ts` | 10 min |
| 1.3 | `Editor.tsx` | 5 min |
| 1.4 | `ComposeModal.tsx` | 2.5 ore |
| 1.5 | `App.tsx` wiring | 20 min |
| 1.6 | Test (sezione 11, 8 test) | 1 ora |
| 1.7 | Typecheck + debug | 20 min |
| 2 | Suite test finale (93 test) | 10 min |
| 3 | Spostamento cartella GitHub | 15 min |
| **Totale** | | **~6.5 ore** |

---

## ✅ Checklist di completamento

- [ ] Typecheck baseline: 0 errori
- [ ] Suite baseline: 85/85 test passano
- [ ] `pdfComposer.ts` creato e funzionante
- [ ] `ComposeModal.tsx` creato con UI completa
- [ ] Voce «Extract & Montage» nel menu Tools
- [ ] `handleCompose` in `App.tsx`
- [ ] Nuovi test 11.1–11.8 tutti passano
- [ ] Suite finale: 93/93 test passano, 0 falliti
- [ ] Typecheck finale: 0 errori
- [ ] Progetto copiato in cartella GitHub
- [ ] `npm install` nella cartella GitHub OK
