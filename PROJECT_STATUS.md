# 📄 PDF Toolkit — Stato del Progetto

**Data**: 28 Giugno 2026  
**Versione**: 3.1.0  
**Ambiente**: Vite + React 19 + TypeScript + Tailwind CSS 4

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| File sorgente | **36** (`.ts` / `.tsx` / `.css`) |
| Righe di codice | **~7.600** |
| Tool implementati | **19** (9 Page + 10 Document + Reorder mode) |
| Dipendenze runtime | 6 |
| DevDependencies | 14 |
| Typecheck | ✅ 0 errori |

---

## 🏗️ Architettura

```
pdfhandler/
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Root — header, mode toggle, portal targets, wiring
│   ├── index.css                         # Tailwind CSS v4
│   │
│   ├── lib/                              # Core logic (no React)
│   │   ├── pdfRenderer.ts               # pdfjs-dist rendering (page + TOC/outline)
│   │   ├── pdfExtractor.ts              # Extract + download helpers
│   │   ├── pdfOperations.ts             # Page operations (delete, rotate, move, split, etc.)
│   │   ├── docOperations.ts             # Document operations (metadata, watermark, etc.)
│   │   ├── crypto.ts                    # AES-GCM encrypt/decrypt
│   │   └── export.ts                    # Text extraction, image export
│   │
│   ├── hooks/                            # React state hooks
│   │   ├── usePDFLoader.ts              # PDF loading + reload (original/working copy)
│   │   ├── usePageSelection.ts          # Multi-page selection state
│   │   ├── useToolState.ts              # Page tool definitions + modal/reorder state
│   │   ├── useDocToolState.ts           # Document tool definitions + modal state
│   │   └── useReorder.ts               # Drag-drop reorder + inline swap
│   │
│   └── components/                       # UI components
│       ├── StandardViewer.tsx            # Viewer con toolbar via createPortal
│       ├── Editor.tsx                    # Editor con toolbar unificata (dropdown Tools + swap in reorder)
│       ├── PDFUploader.tsx               # Drag & drop upload
│       ├── TOCPanel.tsx                  # Table of contents sidebar (ricorsivo)
│       ├── ThumbnailGrid.tsx             # Virtual grid (3-6 cols) + reorder drag & drop
│       ├── Thumbnail.tsx                 # Single thumbnail + badge View + page number
│       │
│       └── doc/modals/                   # 15 modali attivi
│           ├── shared.tsx                # DialogShell, RangeSelector, SubsetSelector, PreviewBar
│           ├── ExtractModal.tsx          # Range, Subset, Output type, Delete after
│           ├── InsertReplaceModal.tsx 🆕 # Insert/Replace unificato con toggle operazione
│           ├── DeleteModal.tsx           # Range, Subset, Warning preview
│           ├── CopyMoveModal.tsx    🆕   # Copy/Move unificato con toggle operazione
│           ├── RotateModal.tsx           # CW90 / 180 / CCW90, Range, Subset
│           ├── ReverseModal.tsx          # Range, Mapping preview
│           ├── SplitModal.tsx       🆕   # 6 modalità: per N / N file / markers / ranges / 1pp / TOC
│           ├── MergeModal.tsx       🆕   # Drag & drop + pulsanti ↑↓ per riordino
│           ├── InfoModal.tsx             # PDF properties viewer
│           ├── MetadataModal.tsx         # Metadata editor
│           ├── WatermarkTextModal.tsx    # Text watermark
│           ├── WatermarkImageModal.tsx   # Image watermark
│           ├── PageNumbersModal.tsx      # Page numbering
│           ├── AddPagesModal.tsx         # Insert blank pages
│           └── CryptoModal.tsx           # Encrypt / Decrypt
```

---

## 🛠️ Tool Implementati

### 🔵 Page Tools (9 + Reorder mode)

| # | Tool | Modale | Novità v3.1 |
|---|------|:------:|-------------|
| 1 | 📤 **Extract** | ✅ | — |
| 2 | 📋 **Insert / Replace** 🆕 | ✅ | Unifica Insert + Replace; toggle Insert/Replace |
| 3 | 🗑️ **Delete** | ✅ | — |
| 4 | 📋 **Copy / Move** 🆕 | ✅ | Unifica Duplicate + Move; toggle Copy/Move |
| 5 | 🔄 **Rotate** | ✅ | — |
| 6 | 🔀 **Reverse** | ✅ | — |
| 7 | ✂️ **Split** 🆕 | ✅ | 6 modalità: +TOC bookmarks (Level 1/2/3/All) |
| 8 | 🔗 **Merge** 🆕 | ✅ | +Pulsanti ↑↓ per riordino manuale (+ drag & drop) |
| 9 | ↕️ **Reorder** 🆕 | 🔧 | Drag & drop + **Swap rapido inline** (due input + pulsante Swap) |

### 🟢 Document Tools (10)

| # | Tool | Interfaccia | Output |
|---|------|-------------|--------|
| 1 | ℹ️ **Info** | Modale read-only | — |
| 2 | 🏷️ **Metadata** | Modale form | In-place reload |
| 3 | ᴀᴀ **Watermark testo** | Modale config | In-place reload |
| 4 | 🖼️ **Watermark img** | Modale upload | In-place reload |
| 5 | ①②③ **Numera pagine** | Modale config | In-place reload |
| 6 | ➕ **Aggiungi pagine** | Modale config | In-place reload |
| 7 | 📝 **Estrai testo** | One-click | Download .txt |
| 8 | 🖼️→ZIP **Esporta PNG** | One-click | Download ZIP |
| 9 | 🔒 **Cifra** | Modale password | Download .pdf.enc |
| 10 | 🔓 **Decifra** | Modale password | Carica decifrato |

---

## 🆕 Modifiche v3.1 (28 Giugno 2026)

### Merge page tools: 11 → 9

| # | Intervento | File | Stato |
|---|-----------|------|:-----:|
| 1 | **Insert / Replace unificato**: nuovo modale con toggle operazione | `InsertReplaceModal.tsx` (nuovo), `App.tsx`, `useToolState.ts` | ✅ |
| 2 | **Swap → Reorder inline**: swap rapido con due input nella toolbar reorder | `Editor.tsx`, `useReorder.ts`, `App.tsx`, `useToolState.ts` | ✅ |

### Nuove funzionalità

| # | Intervento | File | Stato |
|---|-----------|------|:-----:|
| 3 | **Split by TOC bookmarks** (6ª modalità): profondità Level 1/2/3/All, inferenza range, front matter, sanitizzazione nomi | `SplitModal.tsx`, `pdfOperations.ts`, `App.tsx` | ✅ |
| 4 | **SplitModal riceve TOC items** come prop; caricamento asincrono in App.tsx | `SplitModal.tsx`, `App.tsx` | ✅ |

### Nuove funzioni in pdfOperations.ts

| Funzione | Descrizione |
|----------|-------------|
| `movePages(bytes, pages, dest)` | Sposta pagine prima/dopo una destinazione (taglia e incolla) |
| `splitByMarkers(bytes, markers, name)` | Split ai marker di pagina (es. dopo 10, 25, 40) |
| `splitByTOC(bytes, tocItems, depth, name)` 🆕 | Split per bookmark TOC con profondità selezionabile, inferenza range, front matter automatico, deduplicazione |

### Editor.tsx

| Modifica | Descrizione |
|----------|-------------|
| Swap inputs in reorder toolbar | Due input numerici (pagina A ↔ pagina B) + pulsante Swap; si azzerano al toggle reorder |

### File preservati (non-distruttività)

Nessuno — tutti i file backup sono stati rimossi nella pulizia v3.1.

---

## 🔜 Da implementare

### 🟡 Priorità MEDIA

| # | Task | File coinvolti | Complessità |
|---|------|---------------|:----------:|
| 1 | **Page Filter in SplitModal** (RangeSelector per filtrare pagine) | `SplitModal.tsx` | 🟡 Media |
| 2 | **Progress bar per TOC split** (100+ file) | `SplitModal.tsx`, `pdfOperations.ts` | 🟡 Media |
| 3 | **Toast feedback** per doc tool istantanei (Export PNG, Extract text) | `App.tsx` | 🟢 Bassa |
| 4 | **Accessibilità**: `aria-label` su pulsanti Merge Up/Down e drag handle | `MergeModal.tsx`, `ThumbnailGrid.tsx` | 🟢 Bassa |
| 5 | **Anteprima canvas nei modali**: renderizzare pagine con pdfjs-dist | Modali vari | 🟡 Media |
| 6 | **Includi PDF corrente nel MergeModal** | `MergeModal.tsx` | 🟢 Bassa |

### 🔵 FUTURA

| # | Task |
|---|------|
| 7 | **Undo/Redo**: cronologia buffer per operazioni in-place |
| 8 | **Dark/Light theme**: toggle tema |
| 9 | **Multi-finestra**: confronto side-by-side di due PDF |
| 10 | **Quick actions nel Reorder**: "Move to start/end", "Reverse selection" |

---

## 🧪 Procedure di Testing

### 1. Typecheck (automatico)

```bash
cd /home/vigliafg/Documenti/pdfhandler
npx tsc --noEmit
```

**Criterio di successo**: 0 errori.  
**Stato attuale**: ✅ Passa.

### 2. Build di produzione

```bash
npx vite build
```

**Criterio di successo**: build completata senza errori. Verificare che la dimensione del bundle sia ragionevole (~1.4 MB).

### 3. Test funzionali manuali

#### A. Toolbar Editor

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Apri un tool page | Click su "Insert / Replace" nel dropdown | Si apre subito InsertReplaceModal |
| Apri un tool doc modale | Click su "Metadata" nel dropdown | Si apre subito MetadataModal |
| Apri un tool doc one-shot | Click su "Esporta PNG" nel dropdown | Scarica subito il file ZIP |
| Apri Reorder | Click su "Reorder" nel dropdown | Si attiva la modalità reorder con swap inputs visibili |
| La toolbar non ha Swap nel dropdown | Apri dropdown Tools | Swap non appare (è inline nel reorder) |

#### B. Insert / Replace (unificato)

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Insert con file esterno | Toggle Insert, carica file, seleziona pagine, dest "After Last" | Pagine inserite in fondo al PDF |
| Replace con "Selected pages" | Seleziona pagine, apri Insert/Replace, toggle Replace, carica file, Range=Selected | Le pagine selezionate vengono sostituite |
| Replace con warning | Sostituisci 2 pagine con 5 da altro file | Preview mostra warning "aggiunte 3 pagine" |
| Toggle Insert↔Replace | Passa da Insert a Replace e viceversa | UI si aggiorna (target pages / destination) |

#### C. Copy / Move

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Copy con "Selected pages" | Seleziona pagine, apri Copy/Move, toggle Copy, dest "After Last" | Le pagine vengono duplicate in fondo |
| Move con "Custom range" | Toggle Move, inserisci `3-5`, dest "Before page 1" | Le pagine 3-5 si spostano all'inizio |
| Copies > 1 | Toggle Copy, imposta copies=3 | 3 copie di ogni pagina selezionata |

#### D. Merge con Up/Down

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Riordina con ↑↓ | Carica 3 PDF, clicca ↑ sul secondo | Il secondo file sale in prima posizione |
| Bottone ↑ disabilitato | Primo elemento della lista | ↑ è grigio, non cliccabile |
| Bottone ↓ disabilitato | Ultimo elemento della lista | ↓ è grigio, non cliccabile |
| Drag & drop funziona ancora | Trascina un file con la maniglia | L'ordine si aggiorna |

#### E. Split (6 modalità)

| Modalità | Input | Verifica |
|----------|-------|----------|
| Every N pages | `10` su PDF da 50 pp. | 5 file nel ZIP, 10 pp. ciascuno |
| Into N files | `4` su PDF da 50 pp. | 4 file: 13+13+12+12 pp. |
| At page markers | `10, 25, 40` su PDF da 50 pp. | 4 file: 1-10, 11-25, 26-40, 41-50 |
| Custom ranges | `1-10, 15-20, 30-50` | 3 file con i range specificati |
| One page per file | (nessun input) | 50 file da 1 pp. ciascuno |
| **By TOC bookmarks** 🆕 | Seleziona Level 1/2/3/All | File nominati con i titoli TOC, range inferiti, ZIP unico |
| TOC con front matter | PDF con capitolo 1 a pagina 5 | File `001 - Front Matter.pdf` (pp. 1-4) + capitoli |
| TOC senza bookmark | PDF senza outline | Radio "By TOC bookmarks" disabilitato, messaggio "no TOC" |
| Preview limitata | One page per file su PDF da 50 pp. | Mostra solo 20 file + "... and 30 more" |

#### F. Reorder con Swap inline 🆕

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Swap due pagine | Inserisci `3` e `7`, clicca Swap | Le pagine 3 e 7 si scambiano nella griglia |
| Swap pagina inesistente | Inserisci `999` e `5` | Bottone Swap disabilitato |
| Swap stessa pagina | Inserisci `5` e `5` | Bottone Swap disabilitato |
| Input si azzerano dopo swap | Esegui uno swap | Entrambi gli input tornano vuoti |
| Input si azzerano al toggle | Entra in reorder, inserisci valori, esci, rientra | Input sono vuoti |

#### G. Operazioni in-place

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Rotate | Ruota pagine 1-3 di 90° CW | Le pagine 1-3 sono ruotate, il documento si ricarica |
| Reverse | Reverse di tutte le pagine | Ordine invertito, documento ricaricato |
| Delete | Elimina pagine 5-10 | PDF ricaricato senza quelle pagine |
| Insert/Replace | Sostituisci pagine 2-3 con pagine da altro PDF | PDF ricaricato con le nuove pagine |
| Reorder Apply | Riordina + clicca Apply Order | PDF ricaricato con nuovo ordine |

#### H. Architettura non-distruttiva

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| Download dopo modify | Esegui un'operazione in-place, clicca Save | Nome file: `xxx_modified.pdf` |
| Download senza modify | Apri un PDF, clicca Save | Nome file: `xxx.pdf` |
| Originale preservato | Dopo N operazioni, scarica | L'originale su disco non è stato toccato |

### 4. Test edge case

| Scenario | Azione | Risultato atteso |
|----------|--------|-----------------|
| PDF senza bookmark TOC | Apri Split → "By TOC bookmarks" | Radio disabilitato, messaggio "no TOC found" |
| PDF con TOC a pagina >1 | Split by TOC su PDF con capitolo 1 a p.5 | File `001 - Front Matter.pdf` + capitoli |
| PDF con 1 pagina | Tutti i tool | Nessun crash, range validati correttamente |
| PDF con 500+ pagine | ThumbnailGrid, Split one-per-page | Performance accettabile, preview limitata a 20 |
| PDF cifrato (.pdf.enc) | Apri file | Si apre CryptoModal per decifrare |
| Range invalido | Inserisci `abc` nel custom range | Bottone Execute disabilitato |
| 0 pagine selezionate | Apri Insert/Replace con "Selected" e nessuna selezione | Bottone Execute disabilitato |

### 5. Comando rapido per test pre-commit

```bash
# Typecheck
npx tsc --noEmit

# Build
npx vite build

# Lint (se configurato)
npx eslint src/
```

---

## 📝 Componenti Condivisi (shared.tsx)

| Componente | Ruolo | Novità v3.0 |
|------------|-------|-------------|
| `DialogShell` | Contenitore modale: title, icon, onCancel, onExecute | — |
| `RangeSelector` | Radio: All / Current / Selected / Custom | Placeholder formato Microsoft |
| `SubsetSelector` | Dropdown: All / Odd / Even | — |
| `PreviewBar` | Barra riepilogo con icona e testo | — |
| `SectionHeader` | Header sezione con label | — |
| `parseRangeString()` | Parser: virgole, intervalli, `N-` (fino alla fine) | Hint Microsoft standard |

---

## 🔧 Stack Tecnico

| Categoria | Libreria | Versione |
|-----------|----------|----------|
| Framework | React | 19.2 |
| Bundler | Vite | 8.0 |
| Linguaggio | TypeScript | 6.0 |
| CSS | Tailwind CSS | 4.3 |
| Rendering PDF | pdfjs-dist | 6.0 |
| Manipolazione | pdf-lib | 1.17 |
| Virtual scroll | @tanstack/react-virtual | 3.14 |
| Compressione | JSZip | 3.10 |
| Crittografia | Web Crypto API | Native |

---

## ⚠️ Limitazioni Note

| Feature | Stato | Motivazione |
|---------|:-----:|-------------|
| Compressione PDF reale | ❌ | Richiede WASM pesante o server (Ghostscript) |
| Crittografia PDF standard | ❌ | pdf-lib non supporta `setEncryption` |
| PDF/A conversione | ❌ | Richiede motori specializzati server-side |
| Watermarking SVG | ❌ | pdf-lib supporta solo PNG/JPG |
| Undo/Redo | ❌ | Possibile con cronologia buffer (pianificato) |
| Progress bar TOC split | ❌ | Da implementare per 100+ file |

---

## 🔜 Riepilogo Fasi

| Fase | Descrizione | Stato |
|------|-------------|:-----:|
| Fase 1 | Toolbar Redesign | ✅ |
| Fase 2 | Extract & Insert Dialogs + architettura non-distruttiva | ✅ |
| Fase 3 | Delete, Replace & Duplicate Dialogs | ✅ |
| Fase 4 | Rotate, Reverse & Split Dialogs | ✅ |
| Fase 5 | Merge, Reorder & Swap | ✅ |
| Fase 6 | Refactoring v3.0 (toolbar, Copy/Move, Merge ↑↓, Split 5 modi) | ✅ |
| **Fase 7** | **Merge tool (Insert+Replace, Swap→Reorder), Split by TOC** | ✅ |
| Fase 8 | Page Filter, Progress bar, Toast feedback, Accessibilità | 🔜 |
| Fase 9 | Undo/Redo, Dark theme, Multi-finestra | 🔵 |

---

**Stato complessivo**: ✅ v3.1 completata. **9 Page Tools** + 10 Document Tools + Reorder mode. Insert/Replace unificato. Swap inline nel reorder. Split con 6 modalità (include TOC bookmarks). Toolbar semplificata. Copy/Move unificato. Merge con pulsanti ↑↓. Typecheck 0 errori. Architettura non-distruttiva attiva. 🔜 Prossimo step: **Page Filter + Progress bar TOC + Toast feedback**.
