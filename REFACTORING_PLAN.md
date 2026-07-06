# 🔷 REFACTORING PLAN — pdfhandler v3.0

**Data**: 28 Giugno 2026
**Versione target**: 3.0.0
**Base di partenza**: v2.9.0 (Fasi 1-5 completate)

---

## 📋 Sommario degli interventi

| # | Intervento | Priorità | Stato |
|---|-----------|:--------:|:-----:|
| 1 | Bug fix: handler mancanti (rotate/reverse/split) | 🔴 ALTA | ⬜ |
| 2 | Standard Microsoft per range pagine | 🟡 MEDIA | ⬜ |
| 3 | Eliminazione bottoni azione toolbar → apertura immediata | 🟡 MEDIA | ⬜ |
| 4 | Accorpamento Copy/Move in unico modale | 🟡 MEDIA | ⬜ |
| 5 | Merge: ordinamento manuale Up/Down | 🔵 FUTURA | ⬜ |

---

## 📦 1. Bug fix: handler mancanti in App.tsx

**Problema**: `handleRotate`, `handleReverse`, `handleSplit` sono referenziati nel JSX ma mai definiti. I modali Rotate, Reverse e Split attualmente non funzionano.

**File**: `src/App.tsx`

**Azione**: Aggiungere le definizioni degli handler mancanti:

- `handleRotate(pageNumbers, angle)` → chiama `rotatePages()` e ricarica il PDF
- `handleReverse(pageNumbers)` → chiama `reversePages()` e ricarica il PDF
- `handleSplit(params)` → chiama `splitPages()` o `splitByRanges()`, scarica ZIP

---

## 📦 2. Standard Microsoft per range di pagine

### Ricerca sullo standard

Lo standard Microsoft (Word, finestre stampa Windows) per specificare pagine usa:
- **Pagina singola**: `10`
- **Range inclusivo**: `1-5` (include 1,2,3,4,5)
- **Separatore**: virgola `,`
- **Spazi opzionali**: `1-5, 10, 15-20` ≡ `1-5,10,15-20`
- Esempio completo: `10-20, 34, 50-51`

### Modifiche

**File**: `src/components/doc/modals/shared.tsx`

L'attuale `parseRangeString()` supporta già il formato Microsoft. Le modifiche sono solo cosmetiche:
1. Placeholder input: `"e.g. 10-20, 34, 50-51"` (invece di `"e.g. 1-5, 10, 20-30, 50-"`)
2. Hint testuale sotto l'input che menzioni esplicitamente la convenzione Microsoft
3. Mantenere l'estensione `N-` (fino alla fine) come comodità aggiuntiva

L'opzione "Selected pages" nel `RangeSelector` esiste già in tutti i modali.

---

## 📦 3. Eliminazione bottoni azione toolbar → apertura immediata

### Situazione attuale

La toolbar Editor ha due pulsanti di azione:
1. Pulsante page tool (viola/blu) — "Open Extract", "Open Delete", ecc.
2. Pulsante doc tool (verde) — "Open Metadata", "Esporta PNG", ecc.

### Nuovo comportamento

Click su un tool nel dropdown → **azione immediata**:
- **Page tool** (`extract`, `insert`, `delete`, `replace`, `rotate`, `reverse`, `split`, `merge`, `swap`, `copymove`) → apre subito il modale corrispondente
- **Reorder** → attiva subito la modalità reorder sulla griglia
- **Doc tool con `needsModal: true`** (`metadata`, `watermark-text`, `watermark-image`, `page-numbers`, `add-pages`, `info`, `encrypt`, `decrypt`) → apre subito il modale
- **Doc tool con `needsModal: false`** (`export-images`, `extract-text`) → esegue subito

### File coinvolti

| File | Modifiche |
|------|-----------|
| `Editor.tsx` | Rimuovere bottoni azione, semplificare props da ~30 a ~18 |
| `App.tsx` | Cleanup props passate a Editor, nuova logica apertura immediata |
| `useToolState.ts` | Aggiungere `openPageModal` già integrato nello stato |
| `useDocToolState.ts` | Aggiungere logica per distinguere modale vs esecuzione immediata |

### Props rimosse da Editor

- `activeTool`, `activeToolDef`, `onToolChange`
- `rotateAngle`, `onRotateAngleChange`
- `splitCount`, `onSplitCountChange`
- `executing`, `activeDocTool`, `activeDocToolDef`
- `onDocToolChange`, `onDocExecute`, `docExecuting`

### Nuove props per Editor

- `onOpenPageModal: (id: PageModalId) => void`
- `onOpenDocModal: (id: DocToolId) => void`
- `onDocInstantAction: (id: DocToolId) => void`

---

## 📦 4. Accorpamento Copy/Move in unico modale

### Analisi

| Tool attuale | Operazione |
|---|---|
| **Duplicate** | Copia pagine X, N copie, in destinazione Y |
| **Move** (nuovo) | Sposta pagine in destinazione Y (taglia e incolla) |

Entrambi condividono la stessa struttura UI:
- Range selector (quali pagine)
- Destinazione (prima/dopo × prima/ultima/custom)
- Unica differenza: Copy ha "Copies" (1-99), Move no

### Nuovo modale unificato

```
┌─────────────────────────────────────────┐
│  📋 Copy / Move Pages                   │
│                                         │
│  Operation:  ○ Copy (duplicate)         │
│              ○ Move (cut & paste)       │
│                                         │
│  ── Page Range ─────────────────────── │
│  ○ All  ○ Current  ○ Selected  ○ Custom│
│  [  10-20, 34, 50-51  ]                │
│                                         │
│  ── Destination ────────────────────── │
│  Location:  [ Before │ After ]          │
│  Page:  ○ First  ○ Last  ○ Custom: [5] │
│                                         │
│  ── Copies (only for Copy mode) ────── │
│  [ 1 ]  (1-99)                         │
│                                         │
│  ── Preview ────────────────────────── │
│  5 pages copied × 1 → 5 pages inserted │
│  after page 10. New total: 55 pages    │
│                                         │
│  [Cancel]  [Copy 5 pages]              │
└─────────────────────────────────────────┘
```

### Nuova funzione `movePages()` in `pdfOperations.ts`

```typescript
export async function movePages(
  sourcePdfBytes: ArrayBuffer,
  pageNumbers: number[],
  dest: { location: 'before' | 'after'; page: number },
): Promise<Uint8Array>
```

Algoritmo:
1. Carica il PDF sorgente
2. Copia le pagine selezionate nella posizione di destinazione (usando `insertPage`)
3. Rimuovi le pagine originali (aggiustando gli indici post-inserimento)
4. Salva e restituisci

### File coinvolti

| File | Operazione |
|------|-----------|
| `CopyMoveModal.tsx` | **NUOVO** — modale Copy/Move unificato |
| `pdfOperations.ts` | Nuova `movePages()` |
| `useToolState.ts` | `duplicate` → `copymove` |
| `App.tsx` | Nuovo handler `handleCopyMove`, rimuovere `handleDuplicate` e `DuplicateModal` |
| `DuplicateModal.tsx` | Preservato come backup, non più referenziato |

---

## 📦 5. Merge: ordinamento manuale Up/Down (FUTURA)

**Specifica**: Nel Merge modal, dopo aver selezionato i PDF dal file picker, i file appaiono in una coda. Ogni elemento della coda deve poter essere spostato manualmente con pulsanti **Up** (↑) e **Down** (↓) per riordinare la sequenza di merge.

### Design previsto

```
┌─────────────────────────────────────────┐
│  🔗 Merge PDFs                          │
│                                         │
│  [+] Add PDF files (drop zone)          │
│                                         │
│  ── Files (3) ──────────────────────── │
│  ┌─────────────────────────────────┐    │
│  │ ↑↓ 📄 document-a.pdf    12 pp. │    │
│  │ ↑↓ 📄 document-b.pdf     5 pp. │    │
│  │ ↑↓ 📄 document-c.pdf     8 pp. │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ── Preview ────────────────────────── │
│  3 files · 25 total pages              │
│                                         │
│  [Cancel]  [Merge 3 files]             │
└─────────────────────────────────────────┘
```

### Modifiche previste

- `MergeModal.tsx`: Sostituire drag & drop con pulsanti ↑↓ (o affiancarli)
- I pulsanti ↑↓ sono più accessibili del solo drag & drop
- Mantenere il drag & drop come alternativa opzionale

**Stato**: 🔵 FUTURA — da implementare in una fase successiva.

---

## 🔧 Ordine di implementazione (questa fase)

| Step | Descrizione | File |
|:----:|------------|------|
| 1 | Bug fix handler mancanti | `App.tsx` |
| 2 | Hint Microsoft range | `shared.tsx` |
| 3 | Nuova `movePages()` | `pdfOperations.ts` |
| 4 | CopyMoveModal | `CopyMoveModal.tsx` (nuovo) |
| 5 | Aggiorna tool state | `useToolState.ts` |
| 6 | Aggiorna app (handler, cleanup, apertura immediata) | `App.tsx` |
| 7 | Semplifica toolbar | `Editor.tsx` |
| 8 | Typecheck + review | — |

---

## 📊 Stima impatto

| Metrica | Prima | Dopo |
|---------|:-----:|:----:|
| Page tool count | 11 | 10 (duplicate e move → copymove) |
| File modali page tool | 11 | 11 (DuplicateModal preservato, +CopyMoveModal) |
| Props Editor | ~30 | ~18 |
| Righe Editor.tsx | ~310 | ~200 (-35%) |
| Righe App.tsx | ~720 | ~800 (+ nuovi handler) |
| Bottoni toolbar | 2 azione | 0 |
| Bug risolti | — | 3 handler mancanti |
