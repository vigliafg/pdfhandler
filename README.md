# 📄 pdfhandler

**pdfhandler** is a cross-platform desktop application for manipulating PDF documents. Built with **React**, **TypeScript**, **Tauri v2**, and **Tailwind CSS**, it offers a complete suite of page-level and document-level tools — all running locally on your machine with a modern, dark-themed UI.

No uploads to external servers. No watermarks. No paywalls. Everything happens client-side.

<p align="center">
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-blue" alt="Platforms" />
  <img src="https://img.shields.io/badge/built%20with-Tauri%20v2-ffc131?logo=tauri" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript" alt="TypeScript" />
</p>

---

## Table of Contents

- [Introduction](#introduction)
- [Launch Modes](#launch-modes)
  - [Prerequisites](#prerequisites)
  - [Development (Browser)](#development-browser)
  - [Development (Desktop App)](#development-desktop-app)
  - [Production Build](#production-build)
- [Application Overview](#application-overview)
  - [Viewer Mode](#viewer-mode)
  - [Editor Mode](#editor-mode)
- [Tools Reference](#tools-reference)
  - [Page Tools](#page-tools)
    - [Extract](#extract)
    - [Insert / Replace](#insert--replace)
    - [Delete](#delete)
    - [Rotate](#rotate)
    - [Copy / Move](#copy--move)
    - [Reverse](#reverse)
    - [Split](#split)
    - [Merge](#merge)
    - [Reorder](#reorder)
    - [Compose (Extract & Montage)](#compose-extract--montage)
  - [Document Tools](#document-tools)
    - [Info](#info)
    - [Metadata](#metadata)
    - [Watermark (Text)](#watermark-text)
    - [Watermark (Image)](#watermark-image)
    - [Page Numbers](#page-numbers)
    - [Add Blank Pages](#add-blank-pages)
    - [Export Images (PNG)](#export-images-png)
    - [Extract Text](#extract-text)
    - [Encrypt](#encrypt)
    - [Decrypt](#decrypt)
- [Table of Contents (TOC) Preservation](#table-of-contents-toc-preservation)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [License](#license)

---

## Introduction

pdfhandler is designed to be your go-to offline PDF toolkit. Whether you need to extract a few pages, merge several documents, add watermarks, split by bookmarks, or encrypt sensitive files — pdfhandler provides an intuitive interface for all these operations.

Key design principles:

- **Non-destructive**: The original PDF is never modified. Operations produce new files — you always keep the original.
- **TOC-aware**: Many operations automatically preserve and update the PDF's table of contents (outline/bookmarks).
- **Offline-first**: All PDF processing happens client-side using [pdf-lib](https://github.com/Hopding/pdf-lib) and [pdfjs-dist](https://github.com/mozilla/pdf.js). No data leaves your machine.
- **Keyboard-friendly**: The viewer supports keyboard shortcuts for navigation and zoom.

---

## Launch Modes

### Prerequisites

- **Node.js** ≥ 18
- **npm** (or pnpm/yarn)
- **Rust** toolchain (for Tauri builds only) — install via [rustup.rs](https://rustup.rs)
- **System dependencies for Tauri on Linux**: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, and others. See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Development (Browser)

Run the app in your browser with hot module replacement (HMR). Note: some Tauri-specific features (like native file dialogs) are not available in browser mode.

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Development (Desktop App)

Run the full desktop application with Tauri's WebView. This gives you native window management and the full feature set.

```bash
# Install dependencies
npm install

# Start Tauri dev mode
npm run tauri dev
```

### Production Build

Build the desktop application for your current platform.

```bash
npm run tauri build
```

The output will be in `src-tauri/target/release/bundle/`:
- **Linux**: `.deb` package and AppImage
- **macOS**: `.dmg` disk image
- **Windows**: `.msi` installer

To build for a specific target:

```bash
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

---

## Application Overview

The application has two main modes, toggled via the top-left switch in the header bar:

### Viewer Mode

A fast, scrollable PDF reader with:

- **Layout modes**: Single page, double-page spread, or 3-column view
- **Zoom**: Manual zoom in/out, fit-to-width, or fit-to-page
- **Rotation**: Rotate the view 90° clockwise or counter-clockwise
- **Table of Contents**: Slide-out panel showing the PDF's outline with clickable navigation
- **Page navigation**: Direct page jump (type a number and press Enter), previous/next buttons
- **Keyboard shortcuts**:

| Key | Action |
|-----|--------|
| `↓` / `↑` | Scroll down / up |
| `PageDown` / `PageUp` | Next / previous set of pages |
| `Home` / `End` | Go to first / last page |
| `+` / `-` | Zoom in / out |
| `=` | Zoom in (alternative) |

- **Download**: Save the current PDF (with `_modified` suffix if the document was altered)

### Editor Mode

A thumbnail-based editor for selecting, reordering, and applying operations to pages:

- **Thumbnail grid**: Configurable columns (3 to 6)
- **Page selection**: Click individual pages, shift-click for ranges, Select All / Deselect All buttons
- **Selection counter**: Shows how many pages are currently selected
- **Current page indicator**: Shows which page is visible in the grid

All page and document tools are accessible from the unified **Tools** dropdown in the editor toolbar.

---

## Tools Reference

The tools are organized into two categories: **Page Tools** (operations that act on specific pages) and **Document Tools** (operations that affect the entire document).

---

### Page Tools

#### Extract

Extract one or more pages from the PDF.

- **Single file**: Creates one PDF containing all extracted pages
- **Individual pages**: Creates a ZIP with one PDF per extracted page
- **Delete after extraction**: Optionally removes the extracted pages from the original document
- Pages can be selected manually or typed as page ranges (e.g., `1-5, 8, 10-12`)

#### Insert / Replace

Two operations in one modal:

- **Insert**: Add pages from another PDF before or after a specific page in the current document. Choose which pages from the source PDF to insert.
- **Replace**: Replace selected pages in the current document with pages from another PDF. If the source has more pages than the target selection, extras are inserted at the replacement position.

The TOC (bookmarks) is automatically remapped to reflect the new page positions.

#### Delete

Remove one or more pages from the PDF. At least one page must remain. Deleted bookmarks are cleaned up, and surviving bookmarks are renumbered.

#### Rotate

Rotate selected pages by **90°**, **180°**, or **270°**. Rotation is applied in addition to any existing page rotation (accumulative). All pages keep their original positions — only the rotation attribute changes.

#### Copy / Move

Move or duplicate pages within the document:

- **Copy**: Create duplicates of selected pages and insert them before/after a target page. Specify how many copies (1–99).
- **Move**: Relocate selected pages to a new position (before/after a target page).

TOC bookmarks are preserved and remapped.

#### Reverse

Reverse the order of pages:
- **All pages**: Entire document is reversed (last becomes first)
- **Selected pages**: Only the chosen pages are reversed in-place; other pages stay where they are

#### Split

Split the PDF into multiple files, bundled in a ZIP. Four split modes:

- **Per number of pages**: Specify how many pages per chunk. E.g., "3" pages per file.
- **Into N equal parts**: Split into a specific number of chunks. Pages are distributed evenly.
- **Custom page ranges**: Manually define ranges like `1-10`, `11-25`, `26-50`.
- **Per TOC bookmarks**: Split at bookmarks of a given depth (1, 2, 3, or all leaf nodes). Useful for splitting a book or report into chapters.

All modes support a **page filter** — only the specified pages are included in the split (e.g., `1-50` to split only the first 50 pages).

#### Merge

Combine multiple PDF files into a single document. Pages are concatenated in the order the files are listed. You can reorder the files via drag-and-drop before merging.

#### Reorder

A special editor mode where you can rearrange pages:

- **Drag and drop**: Grab a thumbnail and drop it between two other pages
- **Numeric swap**: Type two page numbers and click "Swap" to exchange their positions
- **Apply Order**: Commits the new arrangement and reloads the document
- TOC bookmarks are fully remapped to follow the pages

#### Compose (Extract & Montage)

Build a completely new PDF by assembling page ranges from multiple source PDFs. You can:

- Upload several PDF files as sources
- Define "chunks" — page ranges from any source (e.g., pages 1-3 from PDF A, pages 5-8 from PDF B)
- Arrange chunks in any order via drag-and-drop
- Preview the final composition

This is essentially a non-linear merge: you pick and choose exactly which pages from which documents go into the final output.

---

### Document Tools

#### Info

View detailed information about the PDF:

- File size
- Page count
- Dimensions of each page (width × height in PDF points)
- Metadata: title, author, subject, keywords, creator, producer

#### Metadata

Edit the PDF's metadata fields:
- **Title**
- **Author**
- **Subject**
- **Keywords**

Changes are applied in-place and the document is reloaded.

#### Watermark (Text)

Add a text watermark to every page. Configurable options:

- **Text**: The watermark string
- **Font size**: In points
- **Opacity**: 0 (invisible) to 1 (fully opaque)
- **Color**: RGB color picker
- **Angle**: Rotation in degrees (e.g., 45° for diagonal watermarks)
- **Position**: Center, tile (grid pattern), or any corner (top-left, top-right, bottom-left, bottom-right)

#### Watermark (Image)

Add an image watermark (PNG or JPEG) to every page:

- **Scale**: As a percentage of page width
- **Opacity**: 0 to 1
- **Position**: Centered or tiled across the page

#### Page Numbers

Add page numbers to every page. Options:

- **Format**: Custom string with `{n}` for current page and `{t}` for total. Example: `"Page {n} of {t}"`
- **Font size**
- **Position**: Bottom-center, bottom-right, bottom-left, or top-center
- **Starting number**: Useful when the first pages are a cover or table of contents (e.g., start numbering from page 5)

#### Add Blank Pages

Insert blank A4 or Letter pages into the document. Specify:

- **Number of pages**: How many blank pages to add
- **Position**: At the start, at the end, or after a specific page number

#### Export Images (PNG)

Export every page as a PNG image, bundled in a ZIP file. Images are rendered at 1.5× scale for good quality. Filenames are padded (e.g., `document-page-0001.png`).

#### Extract Text

Extract all readable text from the PDF and download it as a `.txt` file. Each page is separated by a header (`--- Page N ---`).

#### Encrypt

Encrypt the PDF with a password using **AES-256-GCM** encryption via the Web Crypto API. The output is a `.pdf.enc` file that can only be opened with the correct password. The encryption format:

- Salt (16 bytes, randomly generated)
- IV (12 bytes, randomly generated)
- PBKDF2 key derivation (100,000 iterations, SHA-256)
- AES-256-GCM encryption

#### Decrypt

Decrypt a `.pdf.enc` file back to its original PDF. You must provide the same password used for encryption. The decrypted PDF is loaded into the application for further editing.

---

## Table of Contents (TOC) Preservation

pdfhandler is built to preserve and remap PDF bookmarks (outline/table of contents) across destructive operations. When a PDF has a TOC, the following operations automatically update it:

| Operation | Behavior |
|-----------|----------|
| **Delete** | Bookmarks pointing to deleted pages are removed; surviving bookmarks are renumbered |
| **Rotate** | Identity mapping — no page numbers change |
| **Copy / Duplicate** | Bookmarks are remapped according to the new page insertion positions |
| **Move** | Bookmarks follow the moved pages to their new positions |
| **Reverse** | Bookmark page numbers are recalculated for the new order |
| **Reorder** | Full remapping based on the new page order |
| **Insert** | Original bookmarks after the insertion point are shifted right |
| **Replace** | Bookmarks are recalculated: replaced pages are remapped to the replacement position |
| **Split** | Each split chunk retains any bookmarks that reference pages within it |

The TOC is extracted via `pdfjs-dist`'s `getOutline()` API and written back using `pdf-lib`'s document outline capabilities.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19 |
| **Language** | TypeScript 6.0 |
| **Bundler** | Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **PDF Rendering** | pdfjs-dist 6 |
| **PDF Manipulation** | pdf-lib 1.17 |
| **Virtual Scrolling** | @tanstack/react-virtual 3 |
| **Archiving** | JSZip 3 |
| **Desktop Shell** | Tauri 2.11 (Rust) |
| **Testing** | Playwright 1.61 |
| **Linting** | ESLint 10 |

---

## Project Structure

```
pdfhandler/
├── src/                          # Frontend source code
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component, orchestrates all tools
│   ├── index.css                 # Global styles (Tailwind)
│   ├── components/
│   │   ├── PDFUploader.tsx       # Drag-and-drop PDF upload screen
│   │   ├── StandardViewer.tsx    # PDF reader (viewer mode)
│   │   ├── Editor.tsx            # Thumbnail grid editor (editor mode)
│   │   ├── PDFViewer.tsx         # PDF rendering utilities
│   │   ├── ThumbnailGrid.tsx     # Virtual-scrolled thumbnail grid
│   │   ├── Thumbnail.tsx         # Individual thumbnail component
│   │   ├── TOCPanel.tsx          # Table of contents slide-out panel
│   │   ├── Toast.tsx             # Toast notification system
│   │   └── doc/
│   │       └── modals/           # Tool modals (one per tool)
│   │           ├── ExtractModal.tsx
│   │           ├── InsertReplaceModal.tsx
│   │           ├── DeleteModal.tsx
│   │           ├── RotateModal.tsx
│   │           ├── CopyMoveModal.tsx
│   │           ├── ReverseModal.tsx
│   │           ├── SplitModal.tsx
│   │           ├── MergeModal.tsx
│   │           ├── ComposeModal.tsx
│   │           ├── MetadataModal.tsx
│   │           ├── WatermarkTextModal.tsx
│   │           ├── WatermarkImageModal.tsx
│   │           ├── PageNumbersModal.tsx
│   │           ├── AddPagesModal.tsx
│   │           ├── InfoModal.tsx
│   │           ├── CryptoModal.tsx
│   │           └── shared.tsx
│   ├── hooks/
│   │   ├── useToolState.ts       # Page tools state management
│   │   ├── useDocToolState.ts    # Document tools state management
│   │   ├── usePDFLoader.ts       # PDF loading and lifecycle
│   │   ├── usePageSelection.ts   # Page multi-selection logic
│   │   └── useReorder.ts         # Reorder mode state
│   └── lib/
│       ├── pdfOperations.ts      # Core operations: delete, rotate, split, merge, reorder, etc.
│       ├── pdfExtractor.ts       # Page extraction
│       ├── pdfComposer.ts        # Multi-source PDF composition
│       ├── docOperations.ts      # Metadata, watermarks, page numbers, blank pages, info
│       ├── crypto.ts             # AES-256-GCM encryption/decryption
│       ├── export.ts             # Text extraction and PNG image export
│       ├── pdfRenderer.ts        # pdfjs-dist rendering utilities
│       ├── pdfMapping.ts         # Page number remapping for TOC preservation
│       └── pdfOutline.ts         # TOC/outline read/write utilities
├── src-tauri/                    # Tauri (Rust) backend
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Window config, bundle settings
│   └── src/
│       ├── main.rs               # Rust entry point
│       └── lib.rs                # Tauri plugin setup
├── tests/                        # Playwright E2E tests
│   ├── smoke.spec.ts
│   ├── extract.spec.ts
│   ├── insert-replace.spec.ts
│   ├── delete.spec.ts
│   ├── rotate.spec.ts
│   ├── copy-move.spec.ts
│   ├── reverse.spec.ts
│   ├── split.spec.ts
│   ├── merge.spec.ts
│   ├── compose.spec.ts
│   ├── reorder.spec.ts
│   ├── toc-preservation.spec.ts
│   └── helpers.ts
├── playwright.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Testing

The project uses **Playwright** for end-to-end testing. Tests are located in the `tests/` directory.

```bash
# Install Playwright browsers
npx playwright install

# Run all tests
npx playwright test

# Run a specific test file
npx playwright test tests/extract.spec.ts

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run tests with UI mode
npx playwright test --ui
```

Test coverage includes:
- Smoke tests (app loads, PDF uploads, mode switching)
- All page tools (extract, insert/replace, delete, rotate, copy/move, reverse, split, merge, reorder, compose)
- TOC preservation across destructive operations

---

## License

[MIT](LICENSE)
