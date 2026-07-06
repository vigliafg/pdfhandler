# 🧪 pdfhandler — Piano di Test Page Tools v3.1

**Data**: 28 Giugno 2026
**Versione target**: 3.1.0
**Metodo**: Test manuale via browser DevTools
**Escluso**: Split by TOC (6ª modalità — test separato)

---

## 📚 PDF di Test

| ID | File | Tipo | Pagine stimate |
|----|------|------|:-------------:|
| **A** | `Internazionale - 26 Giugno 2026.pdf` | Settimanale | ~100 |
| **B** | `Il Venerdi di Repubblica - 26 Giugno 2026.pdf` | Supplemento | ~80-120 |
| **C** | `Corriere della Sera Sette - 26 Giugno 2026.pdf` | Settimanale | ~100-150 |

> **Nota**: I conteggi esatti (es. `numPages`) vanno rilevati all'apertura del PDF. Adatta i numeri nei test al valore reale.

---

## 📋 Riepilogo Test

| # | Tool | Casi | PDF usati |
|---|------|:----:|-----------|
| 1 | 📤 Extract | 11 | A |
| 2 | 📋 Insert / Replace | 12 | A + B |
| 3 | 🗑️ Delete | 7 | A |
| 4 | 📋 Copy / Move | 9 | A |
| 5 | 🔄 Rotate | 6 | A |
| 6 | 🔀 Reverse | 6 | A |
| 7 | ✂️ Split | 12 | A |
| 8 | 🔗 Merge | 7 | A + B + C |
| 9 | ↕️ Reorder | 7 | A |
| **Totale** | | **77** | |

---

## 1. 📤 Extract

**PDF**: A (`Internazionale`)

### 1.1 Extract All → Single PDF
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A in Editor | Documento caricato |
| 2 | Tools ▼ → Extract | ExtractModal aperto |
| 3 | Range: seleziona **All** | Preview: `N pages will be extracted` |
| 4 | Output: **Single PDF** | Nome: `Internazionale - 26 Giugno 2026-extracted.pdf` |
| 5 | Clicca **Extract** | ✅ Download `*-extracted.pdf`, il file ha N pagine |

### 1.2 Extract All → Separate files (ZIP)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **All** | — |
| 3 | Output: **Separate files (ZIP)** | Nome: `*-extracted.zip` |
| 4 | Clicca **Extract** | ✅ Download ZIP, contiene N PDF da 1 pagina ciascuno |

### 1.3 Extract Current Page
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **Current** | Preview: `1 page will be extracted` |
| 3 | Clicca **Extract** | ✅ Download PDF con 1 pagina (quella corrente) |

### 1.4 Extract Selected Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Seleziona pagine 5, 8, 12-15, 20 nella griglia | Badge blu: `7 sel.` |
| 2 | Tools ▼ → Extract | ExtractModal aperto, Range: auto **Selected** |
| 3 | Preview: `7 pages will be extracted (from selected pages)` | — |
| 4 | Clicca **Extract** | ✅ Download PDF/ZIP con le 7 pagine selezionate |

### 1.5 Extract Custom Range
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **Custom**, inserisci `10-20, 34, 50-51` | Preview mostra 15 pagine (10-20=11 + 34=1 + 50-51=2 + ? no, 10-20 è 11 pagine, 34 è 1, 50-51 è 2 = 14) |
| 3 | Clicca **Extract** | ✅ Download con le 14 pagine corrette |

### 1.6 Extract Odd Pages (Subset)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **All** | — |
| 3 | Subset: **Odd** | Preview: ~N/2 pagine (solo dispari) |
| 4 | Clicca **Extract** | ✅ Download con solo pagine dispari (1,3,5,...) |

### 1.7 Extract Even Pages (Subset)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **All** | — |
| 3 | Subset: **Even** | Preview: ~N/2 pagine (solo pari) |
| 4 | Clicca **Extract** | ✅ Download con solo pagine pari (2,4,6,...) |

### 1.8 Extract + Delete After (operazione combinata)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **Custom**, inserisci `5-10` | 6 pagine selezionate |
| 3 | ✅ **Delete pages after extraction** | Preview warning: `PDF original: N → N-6 pages` |
| 4 | Clicca **Extract** | ✅ Download estratto + PDF ricaricato senza pagine 5-10 |
| 5 | Verifica conteggio pagine nella toolbar | Mostra `N-6` pagine |

### 1.9 Edge: Custom Range Vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract | ExtractModal aperto |
| 2 | Range: **Custom**, NON inserire testo | Bottone **Extract** disabilitato |

### 1.10 Edge: Selected con 0 Selezioni
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Deseleziona tutto (None) | `0 sel.` nella toolbar |
| 2 | Tools ▼ → Extract, Range: **Selected** | Bottone **Extract** disabilitato |

### 1.11 Edge: Custom Range Fuori Limite
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Extract, Range: **Custom** | — |
| 2 | Inserisci `999-1000` (oltre numPages) | Preview: 0 pagine. Bottone **Extract** disabilitato |

---

## 2. 📋 Insert / Replace

**PDF**: A (`Internazionale`) come target, B (`Il Venerdì`) come sorgente

### 2.1 Insert: Tutte le pagine di B dopo l'ultima di A
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | Documento target caricato |
| 2 | Tools ▼ → **Insert / Replace** | Modale aperto con toggle Insert attivo |
| 3 | Operation: **Insert** (default) | Sezione Destination visibile, Target Pages nascosta |
| 4 | Clicca **Choose file...**, seleziona PDF B | Mostra `Il Venerdi...` con conteggio pagine |
| 5 | Source pages: **All** | Tutte le pagine di B selezionate |
| 6 | Destination: Location **After**, Page **Last** | — |
| 7 | Preview: `X pages from Il Venerdi... inserted after page N` | Nuovo totale: `N + X` |
| 8 | Clicca **Insert** | ✅ PDF ricaricato: pagine di A + pagine di B in fondo |

### 2.2 Insert: Range personalizzato da B prima della prima pagina
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Insert / Replace, Operation: **Insert** | — |
| 3 | Carica PDF B, source pages: **Custom** `5-10` | 6 pagine da B |
| 4 | Destination: Location **Before**, Page **First** | — |
| 5 | Clicca **Insert** | ✅ Pagine 5-10 di B inserite prima dell'inizio di A |

### 2.3 Insert: Posizione personalizzata + dopo
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Insert / Replace, Operation: **Insert** | — |
| 3 | Carica PDF B, source: **All** | — |
| 4 | Destination: **After**, Page: **Custom** `10` | Input custom page mostra `10` |
| 5 | Clicca **Insert** | ✅ Pagine di B inserite dopo pagina 10 di A |

### 2.4 Replace: Tutte le pagine di A con tutte di B
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Insert / Replace | Modale aperto |
| 3 | Operation: clicca **Replace** | Appare sezione Target Pages, scompare Destination |
| 4 | Target pages: **All** | — |
| 5 | Carica PDF B, source: **All** | — |
| 6 | Preview mostra warning se |B| ≠ |A| | — |
| 7 | Clicca **Replace** | ✅ PDF ricaricato = interamente PDF B |

### 2.5 Replace: Pagina corrente con range da B
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Insert / Replace, Operation: **Replace** | — |
| 3 | Target pages: **Current** | 1 pagina |
| 4 | Carica PDF B, source: **Custom** `3-7` | 5 pagine da B |
| 5 | Preview warning: `⚠️ Replacement will add 4 more pages than removed` | — |
| 6 | Clicca **Replace** | ✅ La pagina corrente sostituita con 5 pagine da B |

### 2.6 Replace: Pagine selezionate
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 10,11,12 (3 pagine) | `3 sel.` |
| 2 | Tools ▼ → Insert / Replace, Operation: **Replace** | Target pages auto: **Selected** |
| 3 | Carica PDF B, source: **All** | — |
| 4 | Clicca **Replace** | ✅ 3 pagine sostituite con tutte le pagine di B |

### 2.7 Replace: Range custom target + range custom source
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Insert / Replace, Operation: **Replace** | — |
| 3 | Target pages: **Custom** `15-20` | 6 pagine |
| 4 | Carica PDF B, source: **Custom** `10-15` | 6 pagine |
| 5 | Clicca **Replace** | ✅ Pagine 15-20 di A sostituite con pagine 10-15 di B |

### 2.8 Edge: Nessun file sorgente (Insert)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Insert / Replace, Operation: **Insert** | — |
| 2 | NON caricare file | Preview: `Select a source PDF file to preview.` |
| 3 | Bottone **Insert** | Disabilitato |

### 2.9 Edge: Toggle Insert ↔ Replace cambia UI
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Insert / Replace | Toggle su **Insert**, sezione Destination visibile |
| 2 | Clicca **Replace** | Appare Target Pages, scompare Destination |
| 3 | Clicca **Insert** | Appare Destination, scompare Target Pages |
| 4 | Verifica: nessun crash, stato precedente preservato | ✅ |

### 2.10 Edge: Replace con Selected + 0 selezioni
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Deseleziona tutto | `0 sel.` |
| 2 | Tools ▼ → Insert / Replace, Operation: **Replace** | — |
| 3 | Target pages: **Selected** | — |
| 4 | Bottone **Replace** | Disabilitato |

### 2.11 Edge: Replace con Custom range vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Insert / Replace, Operation: **Replace** | — |
| 2 | Target pages: **Custom**, input vuoto | Bottone **Replace** disabilitato |

### 2.12 Edge: Source Custom range vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Insert / Replace | — |
| 2 | Carica PDF B, source: **Custom**, input vuoto | Bottone Execute disabilitato |

---

## 3. 🗑️ Delete

**PDF**: A (`Internazionale`)

### 3.1 Delete Current Page
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete | DeleteModal aperto, Range: auto |
| 3 | Range: **Current** | Preview: `1 page will be deleted. N-1 pages will remain.` |
| 4 | Clicca **Delete 1 page** | ✅ PDF ricaricato con 1 pagina in meno |
| 5 | ⚠️ Ripristina PDF A (File → Open → ricarica Internazionale) | — |

### 3.2 Delete Selected Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 5,6,7,8 (4 pagine) | `4 sel.` |
| 2 | Tools ▼ → Delete | Range auto: **Selected** |
| 3 | Preview: `4 pages deleted. N-4 pages remain.` | — |
| 4 | Clicca **Delete 4 pages** | ✅ PDF ricaricato senza pagine 5-8 |

### 3.3 Delete Custom Range
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete | — |
| 3 | Range: **Custom**, inserisci `10-20` | Preview: `11 pages deleted. N-11 pages remain.` |
| 4 | Clicca **Delete 11 pages** | ✅ PDF ricaricato senza pagine 10-20 |

### 3.4 Delete Odd Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete, Range: **All** | — |
| 3 | Subset: **Odd** | Preview: ~N/2 pagine eliminate |
| 4 | Clicca **Delete** | ✅ PDF ricaricato, solo pagine pari rimaste |

### 3.5 Delete Even Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete, Range: **All** | — |
| 3 | Subset: **Even** | Preview: ~N/2 pagine eliminate |
| 4 | Clicca **Delete** | ✅ PDF ricaricato, solo pagine dispari rimaste |

### 3.6 Edge: Tentativo di Cancellare Tutte le Pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete, Range: **All** | Preview: `N pages deleted. 0 pages remain.` |
| 3 | Bottone **Delete** | ❌ Disabilitato. Warning: `⚠️ Cannot delete all pages — at least one must remain.` |

### 3.7 Edge: Meno di 5 Pagine Rimanenti
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Delete, Range: **Custom** `1-(N-3)` | Preview: restano 3 pagine |
| 3 | Preview warning: `⚠️ Only 3 pages will remain after deletion.` | Bottone Delete abilitato (scelta deliberata) |

---

## 4. 📋 Copy / Move

**PDF**: A (`Internazionale`)

### 4.1 Copy: Selected Pages dopo l'ultima
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 10,11,12 (3 pagine) | `3 sel.` |
| 2 | Tools ▼ → Copy / Move | Modale aperto, toggle **Copy** attivo |
| 3 | Operation: **Copy** (default) | Appare campo Copies (1-99) |
| 4 | Range: **Selected** | 3 pagine |
| 5 | Destination: Location **After**, Page **Last** | — |
| 6 | Copies: `1` | — |
| 7 | Preview: `3 pages copied × 1 → 3 pages inserted after page N. New total: N+3` | — |
| 8 | Clicca **Copy 3 pages** | ✅ PDF ricaricato: originali + copie in fondo |

### 4.2 Copy: Custom Range con 3 Copie
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Copy / Move, Operation: **Copy** | — |
| 3 | Range: **Custom** `3-5` | 3 pagine |
| 4 | Copies: `3` | — |
| 5 | Destination: Location **Before**, Page **First** | — |
| 6 | Preview: `3 pages copied × 3 → 9 pages inserted before page 1` | — |
| 7 | Clicca **Copy** | ✅ PDF ricaricato con 9 copie inserite all'inizio |

### 4.3 Copy: Current Page con 5 Copie
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Copy / Move, Operation: **Copy** | — |
| 3 | Range: **Current** | 1 pagina |
| 4 | Copies: `5` | — |
| 5 | Destination: Location **After**, Page **First** | — |
| 6 | Clicca **Copy** | ✅ 5 copie della pagina corrente dopo pag. 1 |

### 4.4 Copy: Tutte le pagine (duplica l'intero documento)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Copy / Move, Operation: **Copy** | — |
| 3 | Range: **All** | Tutte le pagine |
| 4 | Copies: `1` | — |
| 5 | Destination: **After Last** | — |
| 6 | Clicca **Copy** | ✅ PDF con il doppio delle pagine (duplicato) |

### 4.5 Move: Selected Pages all'inizio
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 50-52 (3 pagine) | `3 sel.` |
| 2 | Tools ▼ → Copy / Move | Modale aperto |
| 3 | Operation: clicca **Move** | Appare campo Copies nascosto |
| 4 | Range: **Selected** | 3 pagine |
| 5 | Destination: Location **Before**, Page **First** | — |
| 6 | Clicca **Move** | ✅ Pagine 50-52 spostate prima di pag. 1 (all'inizio) |

### 4.6 Move: Custom Range in fondo
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Copy / Move, Operation: **Move** | — |
| 3 | Range: **Custom** `3-5` | 3 pagine |
| 4 | Destination: Location **After**, Page **Last** | — |
| 5 | Clicca **Move** | ✅ Pagine 3-5 spostate in fondo |

### 4.7 Move: Current Page dopo pagina 15
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, vai a pagina 30 | — |
| 2 | Tools ▼ → Copy / Move, Operation: **Move** | — |
| 3 | Range: **Current** (pagina 30) | — |
| 4 | Destination: Location **After**, Page: **Custom** `15` | — |
| 5 | Clicca **Move** | ✅ Pagina 30 spostata dopo pagina 15 |

### 4.8 Edge: Selected con 0 Selezioni (Copy)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Deseleziona tutto | `0 sel.` |
| 2 | Tools ▼ → Copy / Move, Operation: **Copy**, Range: **Selected** | Bottone **Copy** disabilitato |

### 4.9 Edge: Toggle Copy ↔ Move nasconde/mostra Copies
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Copy / Move | Toggle **Copy**: campo Copies visibile (default 1) |
| 2 | Clicca **Move** | Campo Copies scompare |
| 3 | Clicca **Copy** | Campo Copies riappare, nessun crash |

---

## 5. 🔄 Rotate

**PDF**: A (`Internazionale`)

### 5.1 Rotate All Pages 90° CW
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Rotate | RotateModal aperto |
| 3 | Range: **All** | — |
| 4 | Angolo: **90° CW** | Bottone selezionato |
| 5 | Clicca **Rotate N pages** | ✅ PDF ricaricato, tutte le pagine ruotate di 90° in senso orario |
| 6 | ⚠️ Ricarica PDF A originale | — |

### 5.2 Rotate Selected Pages 180°
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 3,4,5 | `3 sel.` |
| 2 | Tools ▼ → Rotate | Range auto: **Selected** |
| 3 | Angolo: **180°** | — |
| 4 | Clicca **Rotate 3 pages** | ✅ Solo pagine 3,4,5 ruotate di 180° |

### 5.3 Rotate Custom Range 90° CCW
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Rotate | — |
| 3 | Range: **Custom** `10-20` | 11 pagine |
| 4 | Angolo: **90° CCW** (270°) | — |
| 5 | Clicca **Rotate 11 pages** | ✅ Pagine 10-20 ruotate di 90° in senso antiorario |

### 5.4 Rotate Current Page 180°
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, posizionati su pagina 7 | — |
| 2 | Tools ▼ → Rotate | — |
| 3 | Range: **Current** | 1 pagina |
| 4 | Angolo: **180°** | — |
| 5 | Clicca **Rotate 1 page** | ✅ Solo pagina 7 ruotata di 180° |

### 5.5 Edge: Selected con 0 Selezioni
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Deseleziona tutto | `0 sel.` |
| 2 | Tools ▼ → Rotate, Range: **Selected** | Bottone **Rotate** disabilitato |

### 5.6 Edge: Custom Range Vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Rotate, Range: **Custom**, input vuoto | Bottone **Rotate** disabilitato |

---

## 6. 🔀 Reverse

**PDF**: A (`Internazionale`)

### 6.1 Reverse All Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Reverse | ReverseModal aperto |
| 3 | Range: **All** | Preview mostra mapping: `1 → N, 2 → N-1, 3 → N-2, 4 → N-3, 5 → N-4, ... (+N-5 more)` |
| 4 | Clicca **Reverse N pages** | ✅ PDF ricaricato con ordine completamente invertito |
| 5 | ⚠️ Ricarica PDF A originale | — |

### 6.2 Reverse Selected Pages
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, seleziona pagine 10,11,12,13,14 (5 pagine) | `5 sel.` |
| 2 | Tools ▼ → Reverse | Range auto: **Selected** |
| 3 | Preview: `5 pages (selected) will be reversed. Mapping: 10→14, 11→13, 12→12, 13→11, 14→10` | — |
| 4 | Clicca **Reverse 5 pages** | ✅ Solo pagine 10-14 invertite tra loro; le altre invariate |

### 6.3 Reverse Custom Range
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Reverse | — |
| 3 | Range: **Custom** `20-30` | 11 pagine |
| 4 | Preview mapping: `20→30, 21→29, 22→28, 23→27, 24→26, ... (+6 more)` | — |
| 5 | Clicca **Reverse 11 pages** | ✅ Pagine 20-30 invertite tra loro |

### 6.4 Reverse Range di 1 Pagina (no-op effettivo)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Reverse, Range: **Custom** `15-15` | 1 pagina, mapping: `15→15` |
| 3 | Clicca **Reverse 1 page** | ✅ PDF invariato (1 pagina invertita con sé stessa) |

### 6.5 Edge: Preview corretto con più di 5 pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Reverse, Range: **Custom** `1-10` | 10 pagine |
| 2 | Preview mostra prime 5 coppie + `... (+5 more)` | ✅ Formato: `1→10, 2→9, 3→8, 4→7, 5→6, ... (+5 more)` |

### 6.6 Edge: Custom Range Vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Reverse, Range: **Custom**, input vuoto | Bottone **Reverse** disabilitato |

---

## 7. ✂️ Split

**PDF**: A (`Internazionale`)
> **Escluso**: modalità "By TOC bookmarks" (test separato)

### 7.1 Every N Pages: N=10
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A | — |
| 2 | Tools ▼ → Split | SplitModal aperto, default **Every N pages** |
| 3 | Input: `10` pages per file | — |
| 4 | Preview: file count = `ceil(N/10)`, ogni file `Internazionale...partXXX-pSTART-END.pdf` | Ultimo file potrebbe avere <10 pagine |
| 5 | Clicca **Split into X files** | ✅ Download ZIP con X file, distribuzione corretta |

### 7.2 Every N Pages: N=1 (≡ One page per file)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **Every N pages**: `1` | — |
| 2 | Preview: N file, ciascuno da 1 pagina | — |
| 3 | Clicca **Split** | ✅ Download ZIP con N PDF da 1 pagina |

### 7.3 Every N Pages: N > Totale Pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **Every N pages**: `9999` (>> N) | — |
| 2 | Preview: **1 file** contenente tutto il PDF | — |
| 3 | Clicca **Split** | ✅ Download ZIP con 1 file (PDF intero) |

### 7.4 Into N Equal Files: N=4
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A (~100 pp.) | — |
| 2 | Tools ▼ → Split, seleziona **Into N equal files** | — |
| 3 | Input: `4` | — |
| 4 | Preview: 4 file con distribuzione equa (es. 25+25+25+25 oppure 25+25+25+25 ±1) | — |
| 5 | Clicca **Split** | ✅ Download ZIP, distribuzione uniforme |

### 7.5 Into N Equal Files: N = Numero Pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **Into N equal files**: inserisci il numero esatto di pagine | — |
| 2 | Preview: N file, ciascuno da 1 pagina (equivalente a One page per file) | — |
| 3 | Clicca **Split** | ✅ Download ZIP con N PDF |

### 7.6 At Page Markers: 10, 25, 40
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A (~100 pp.) | — |
| 2 | Tools ▼ → Split, seleziona **At page markers** | — |
| 3 | Input: `10, 25, 40` | — |
| 4 | Preview: 4 file (1-10, 11-25, 26-40, 41-N) | — |
| 5 | Clicca **Split** | ✅ 4 file nel ZIP con i range corretti |

### 7.7 At Page Markers: Input Vuoto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **At page markers**, input vuoto | Preview: 0 file. Bottone **Split** disabilitato |

### 7.8 Custom Ranges: 1-10, 15-20, 30-50
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, seleziona **Custom ranges** | — |
| 2 | Input: `1-10, 15-20, 30-50` | — |
| 3 | Preview: 3 file con i range specificati | — |
| 4 | Clicca **Split** | ✅ ZIP con 3 file, ciascuno con le pagine del range |

### 7.9 Custom Ranges: Range a Pagina Singola
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **Custom ranges** | — |
| 2 | Input: `5, 12, 25` | — |
| 3 | Preview: 3 file (5-5, 12-12, 25-25) | — |
| 4 | Clicca **Split** | ✅ ZIP con 3 file da 1 pagina ciascuno |

### 7.10 One Page per File
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, seleziona **One page per file** | — |
| 2 | Preview: N file da 1 pp. ciascuno | — |
| 3 | Clicca **Split** | ✅ Download ZIP con N PDF da 1 pagina |

### 7.11 Preview: Limite 20 File Mostrati
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, **One page per file** | — |
| 2 | Se N > 20: la lista mostra solo i primi 20 | ✅ In fondo: `... and X more files` |
| 3 | Se N ≤ 20: tutti i file visibili | ✅ Nessun messaggio "and more" |

### 7.12 Preview Bar: Riepilogo Corretto
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Split, modalità qualsiasi | — |
| 2 | Preview bar in fondo: `N pages → X files in Internazionale-split.zip` | ✅ Corretto per ogni modalità |

---

## 8. 🔗 Merge

**PDF**: A (`Internazionale`), B (`Il Venerdì`), C (`Corriere della Sera Sette`)

### 8.1 Merge 2 PDF
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri un PDF qualsiasi | — |
| 2 | Tools ▼ → Merge | MergeModal aperto |
| 3 | Carica PDF A, poi PDF B | Lista: A (N pagine), B (M pagine) |
| 4 | Preview: `2 files · N+M total pages` | — |
| 5 | Clicca **Merge 2 files** | ✅ PDF ricaricato con N+M pagine (A + B) |

### 8.2 Merge 3 PDF
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | MergeModal aperto |
| 2 | Carica PDF A, B, C | Lista: 3 file in ordine |
| 3 | Clicca **Merge 3 files** | ✅ PDF ricaricato = A + B + C |

### 8.3 Riordino con Pulsanti ↑↓ nel Merge
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | — |
| 2 | Carica A, B, C (ordine: A, B, C) | — |
| 3 | Seleziona B nella lista, clicca **↑** | B sale in prima posizione (ordine: B, A, C) |
| 4 | Seleziona B, clicca **↓** | B scende in seconda posizione (ordine: A, B, C) |
| 5 | Verifica: ↑ disabilitato per primo elemento | ✅ Bottone ↑ grigio, non cliccabile |
| 6 | Verifica: ↓ disabilitato per ultimo elemento | ✅ Bottone ↓ grigio, non cliccabile |

### 8.4 Drag & Drop nel Merge
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | — |
| 2 | Carica A, B, C | — |
| 3 | Trascina C sopra A usando la maniglia | Ordine: C, A, B |
| 4 | Clicca **Merge** | ✅ PDF con ordine C + A + B |

### 8.5 Merge: Verifica Conteggio Pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | — |
| 2 | Carica A, B | — |
| 3 | Preview mostra: `2 files · |A|+|B| total pages` | Somma corretta |
| 4 | Dopo merge, toolbar mostra `(|A|+|B|)` | ✅ Conteggio esatto |

### 8.6 Merge con 1 Solo File
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | — |
| 2 | Carica solo PDF A | Lista: 1 file |
| 3 | Clicca **Merge 1 file** | ✅ PDF invariato (stesso contenuto, singolo file) |

### 8.7 Edge: Nessun File Caricato
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Tools ▼ → Merge | MergeModal aperto |
| 2 | NON caricare file | Bottone **Merge** disabilitato (o non visibile) |

---

## 9. ↕️ Reorder (con Swap inline)

**PDF**: A (`Internazionale`)

### 9.1 Drag & Drop: Sposta Pagina
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A in Editor | — |
| 2 | Tools ▼ → **Reorder** | Griglia entra in modalità reorder (bordi ambra) |
| 3 | Toolbar mostra: "Reorder" + input Swap + Cancel + Apply Order | ✅ |
| 4 | Trascina la pagina 5 nella posizione 10 | Le anteprime si aggiornano: pag. 5 ora in posizione 10 |
| 5 | Clicca **Apply Order** | ✅ PDF ricaricato con il nuovo ordine |
| 6 | ⚠️ Ricarica PDF A originale | — |

### 9.2 Quick Swap: Scambia Due Pagine
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | Modalità reorder attiva |
| 2 | Input sinistro: `3`, input destro: `7` | Bottone **Swap** abilitato |
| 3 | Clicca **Swap** | ✅ Pagine 3 e 7 invertite nella griglia; input azzerati |
| 4 | Clicca **Apply Order** | ✅ PDF ricaricato con swap applicato |

### 9.3 Quick Swap: Stessa Pagina (Disabilitato)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | — |
| 2 | Input sinistro: `5`, input destro: `5` | Bottone **Swap** disabilitato |

### 9.4 Quick Swap: Pagina Fuori Range (Disabilitato)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | — |
| 2 | Input sinistro: `999`, input destro: `5` | Bottone **Swap** disabilitato (999 > N) |

### 9.5 Quick Swap: Input non Numerico (Disabilitato)
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | — |
| 2 | Lascia input A vuoto | Bottone **Swap** disabilitato |

### 9.6 Cancel: Ripristina Ordine Originale
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | — |
| 2 | Esegui alcune operazioni (drag + swap) | Ordine modificato visivamente |
| 3 | Clicca **Cancel** | ✅ Griglia torna in modalità normale, ordine originale preservato |
| 4 | PDF NON modificato | ✅ Conferma: stesso numero di pagine di prima |

### 9.7 Swap Input Azzerati al Rientro in Reorder
| Step | Azione | Risultato atteso |
|:----:|--------|-----------------|
| 1 | Apri PDF A, Tools ▼ → Reorder | — |
| 2 | Inserisci `3` e `7` negli input swap, ma NON cliccare Swap | — |
| 3 | Clicca **Cancel** | Esce dal reorder |
| 4 | Tools ▼ → Reorder di nuovo | ✅ Input swap sono vuoti (non mostrano 3 e 7 di prima) |

---

## 🧹 Procedura Post-Test

Dopo ogni test che modifica il PDF in-place (Delete, Rotate, Reverse, Copy, Move, Insert/Replace), **ricarica il PDF originale** per garantire che il test successivo parta da uno stato pulito:

```
File → Open → seleziona il PDF originale
```

I test di Split, Extract, e Merge producono download e non modificano il PDF aperto, quindi non richiedono ricarica.

---

## 📊 Riepilogo Copertura

| Tool | Range | Subset | Operazioni | Edge Cases | Totale |
|------|:-----:|:------:|:----------:|:----------:|:------:|
| Extract | All,Cur,Sel,Cust | All,Odd,Even | Single,Separate,DelAfter | Vuoto,0-sel,OutOfRange | 11 |
| Insert/Replace | All,Cur,Sel,Cust | — | Insert,Replace | NoFile,Toggle,Vuoto | 12 |
| Delete | All,Cur,Sel,Cust | All,Odd,Even | — | AllPages,<5remain | 7 |
| Copy/Move | All,Cur,Sel,Cust | — | Copy,Move,Copies | 0-sel,Toggle | 9 |
| Rotate | All,Cur,Sel,Cust | — | 90CW,180,90CCW | 0-sel,Vuoto | 6 |
| Reverse | All,Sel,Cust | — | — | 1pag,Preview,Vuoto | 6 |
| Split | — | — | 5 modalità | N=1,N>tot,Vuoto,Preview | 12 |
| Merge | — | — | Drag,UpDown | 1file,NoFile | 7 |
| Reorder | — | — | Drag,Swap | StessaPg,OutRange,Cancel,Reset | 7 |
| **Totale** | | | | | **77** |
