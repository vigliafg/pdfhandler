import { useRef, useCallback, useState, useEffect } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { StandardViewer } from './components/StandardViewer';
import { TOCPanel } from './components/TOCPanel';

import { Editor } from './components/Editor';
// Doc tool modals
import { MetadataModal } from './components/doc/modals/MetadataModal';
import { WatermarkTextModal } from './components/doc/modals/WatermarkTextModal';
import { WatermarkImageModal } from './components/doc/modals/WatermarkImageModal';
import { PageNumbersModal } from './components/doc/modals/PageNumbersModal';
import { AddPagesModal } from './components/doc/modals/AddPagesModal';
import { InfoModal } from './components/doc/modals/InfoModal';
import { CryptoModal } from './components/doc/modals/CryptoModal';
import { ExtractModal, type ExtractOptions } from './components/doc/modals/ExtractModal';
import { InsertReplaceModal, type InsertReplaceParams } from './components/doc/modals/InsertReplaceModal';
import { DeleteModal } from './components/doc/modals/DeleteModal';
import { CopyMoveModal } from './components/doc/modals/CopyMoveModal';
import { RotateModal } from './components/doc/modals/RotateModal';
import { ReverseModal } from './components/doc/modals/ReverseModal';
import { SplitModal, type SplitParams } from './components/doc/modals/SplitModal';
import { MergeModal } from './components/doc/modals/MergeModal';
import { ComposeModal, type ComposeParams } from './components/doc/modals/ComposeModal';
import { composePDF } from './lib/pdfComposer';
// Hooks
import { usePDFLoader } from './hooks/usePDFLoader';
import { usePageSelection } from './hooks/usePageSelection';
import { useToolState, type PageModalId } from './hooks/useToolState';
import { useReorder } from './hooks/useReorder';
import { useDocToolState, type DocToolId } from './hooks/useDocToolState';
// Operations
import { extractPages, downloadPDF } from './lib/pdfExtractor';
import {
  deletePages, rotatePages, duplicatePages, reversePages,
  splitPages, reorderPages, downloadZip, insertPages, replacePages, splitByRanges, splitByMarkers, movePages, splitByTOC,
  type RotationAngle,
  type TOCItem,
} from './lib/pdfOperations';
import { encryptPDF, decryptPDF, isEncryptedPDF } from './lib/crypto';
import { extractText, downloadText, exportImagesAsZip } from './lib/export';
import { getOutline } from './lib/pdfRenderer';
import { Toast, useToast } from './components/Toast';

function App() {
  const { pdf, pdfBytes, numPages, loading, error, fileName, originalFileName, isModified, loadPDFFromFile, loadPDFFromBytes } =
    usePDFLoader();
  const { selectedPages, togglePage, selectAll, deselectAll, selectRange, selectedCount } =
    usePageSelection();
  const tool = useToolState();
  const reorder = useReorder();
  const doc = useDocToolState();
  const { toasts, showToast } = useToast();

  const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');
  const [executing, setExecuting] = useState(false);
  const [docExecuting, setDocExecuting] = useState(false);
  const [pendingEncryptedBytes, setPendingEncryptedBytes] = useState<ArrayBuffer | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItemsForSplit, setTocItemsForSplit] = useState<TOCItem[] | null>(null);
  const [cachedTOCItems, setCachedTOCItems] = useState<TOCItem[] | null>(null);
  const [tocLoading, setTocLoading] = useState(false);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);
  const lastViewerPageRef = useRef(1);
  const lastEditorFirstPageRef = useRef(1);
  const [editorCurrentPage, setEditorCurrentPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load TOC for Split modal ──────────────────────────────
  // Uses cached TOC items from last operation when available,
  // otherwise extracts from the current PDF via pdfjs-dist.

  useEffect(() => {
    if (tool.pageModalOpen === 'split' && pdf) {
      if (cachedTOCItems && cachedTOCItems.length > 0) {
        setTocItemsForSplit(cachedTOCItems);
        setTocLoading(false);
      } else {
        setTocItemsForSplit(null);
        setTocLoading(true);
        getOutline(pdf)
          .then((items) => { setTocItemsForSplit(items); setCachedTOCItems(items); })
          .catch(() => setTocItemsForSplit([]))
          .finally(() => setTocLoading(false));
      }
    } else if (tool.pageModalOpen !== 'split') {
      setTocItemsForSplit(null);
    }
  }, [tool.pageModalOpen, pdf, cachedTOCItems]);

  // ── File handling ──────────────────────────────────────────

  const handleFileSelect = useCallback(
    (file: File) => {
      deselectAll();
      setCachedTOCItems(null);
      if (isEncryptedPDF(file.name)) {
        file.arrayBuffer().then((buf) => {
          setPendingEncryptedBytes(buf);
          doc.openModal('decrypt');
        });
        return;
      }
      loadPDFFromFile(file);
    },
    [loadPDFFromFile, deselectAll, doc],
  );

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ── Reload after in-place modification ─────────────────────

  const reloadPDF = useCallback(
    async (newBytes: Uint8Array) => {
      const buffer = newBytes.buffer.slice(
        newBytes.byteOffset, newBytes.byteOffset + newBytes.byteLength,
      ) as ArrayBuffer;
      await loadPDFFromBytes(buffer, fileName ?? undefined);
    },
    [loadPDFFromBytes, fileName],
  );

  // ── Doc Tool: open modal ───────────────────────────────────

  const handleOpenDocModal = useCallback(
    (id: DocToolId) => {
      doc.openModal(id);
    },
    [doc],
  );

  // ── Doc Tool: instant action (no modal) ────────────────────

  const handleDocInstantAction = useCallback(async (id: DocToolId) => {
    if (!pdfBytes || docExecuting) return;
    const base = fileName?.replace(/\.pdf$/i, '') ?? 'output';
    setDocExecuting(true);
    try {
      if (id === 'export-images') {
        const zip = await exportImagesAsZip(pdfBytes, base, 1.5, 'png');
        downloadZip(zip, `${base}-images.zip`);
        showToast('success', `Exported images from ${base} as PNG`);
      } else if (id === 'extract-text') {
        const text = await extractText(pdfBytes);
        downloadText(text, `${base}-text.txt`);
        showToast('success', `Extracted text from ${base}`);
      }
    } catch (err: any) { showToast('error', err.message); }
    finally { setDocExecuting(false); }
  }, [pdfBytes, fileName, docExecuting, showToast]);

  // ── Doc Tool modal handlers ────────────────────────────────

  const handleMetadataApply = useCallback(async (bytes: Uint8Array) => {
    await reloadPDF(bytes);
  }, [reloadPDF]);

  const handleWatermarkTextApply = useCallback(async (bytes: Uint8Array) => {
    await reloadPDF(bytes);
  }, [reloadPDF]);

  const handleWatermarkImageApply = useCallback(async (bytes: Uint8Array) => {
    await reloadPDF(bytes);
  }, [reloadPDF]);

  const handlePageNumbersApply = useCallback(async (bytes: Uint8Array) => {
    await reloadPDF(bytes);
  }, [reloadPDF]);

  const handleAddPagesApply = useCallback(async (bytes: Uint8Array) => {
    deselectAll();
    await reloadPDF(bytes);
  }, [reloadPDF, deselectAll]);

  // ── Crypto ─────────────────────────────────────────────────

  const handleEncrypt = useCallback(async (password: string) => {
    if (!pdfBytes) return;
    setDocExecuting(true);
    try {
      const encrypted = await encryptPDF(new Uint8Array(pdfBytes), password);
      const blob = new Blob([encrypted as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = originalFileName?.replace(/\.pdf$/i, '') ?? fileName?.replace(/\.pdf$/i, '') ?? 'document';
      const encName = isModified ? `${base}_modified.pdf.enc` : `${base}.pdf.enc`;
      a.download = encName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) { showToast('error', err.message); }
    finally { setDocExecuting(false); }
  }, [pdfBytes, fileName, originalFileName, isModified, showToast]);

  const handleDecrypt = useCallback(async (password: string) => {
    if (!pendingEncryptedBytes) return;
    setDocExecuting(true);
    try {
      const decrypted = await decryptPDF(new Uint8Array(pendingEncryptedBytes), password);
      const buf = (decrypted.buffer.slice(
        decrypted.byteOffset, decrypted.byteOffset + decrypted.byteLength
      ) as ArrayBuffer);
      await loadPDFFromBytes(buf, fileName ?? 'decrypted.pdf');
      setPendingEncryptedBytes(null);
    } catch (err: any) {
      showToast('error', 'Decryption failed. Wrong password?');
    }
    finally { setDocExecuting(false); }
  }, [pendingEncryptedBytes, loadPDFFromBytes, fileName, showToast]);

  // ── Select all ─────────────────────────────────────────────

  const handleSelectAll = useCallback(() => selectAll(numPages), [selectAll, numPages]);

  // ── Page Tool: open modal (immediate from toolbar) ─────────

  const handleOpenPageModal = useCallback((id: PageModalId) => {
    tool.openPageModal(id);
  }, [tool]);

  // ── Reorder (with inline swap) ─────────────────────────────

  const handleEnterReorder = useCallback(() => {
    reorder.initializeOrder(numPages);
    tool.enterReorderMode();
  }, [reorder, numPages, tool]);

  const handleReorderApply = useCallback(async () => {
    if (!pdfBytes || executing) return;
    setExecuting(true);
    try {
      deselectAll();
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      const result = await reorderPages(pdfBytes, reorder.pageOrder, tocItems);
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
      tool.exitReorderMode();
    } catch (err: any) { showToast('error', err.message); setTocLoading(false); }
    finally { setExecuting(false); }
  }, [pdfBytes, reorder.pageOrder, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  const handleReorderCancel = useCallback(() => tool.exitReorderMode(), [tool]);

  const handleReorderMovePage = useCallback((fromIndex: number, toIndex: number) => {
    reorder.movePage(fromIndex, toIndex);
  }, [reorder]);

  const handleReorderSwap = useCallback((pageA: number, pageB: number) => {
    reorder.swapPages(pageA, pageB);
  }, [reorder]);

  // ── Compose (Extract & Montage) ──────────────────────────

  const handleCompose = useCallback(async (params: ComposeParams) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const bytes = await composePDF(params.chunks, params.sources);
      const buf = (bytes.buffer.slice(
        bytes.byteOffset, bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer);
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

  // ── Merge ──────────────────────────────────────────────────

  const handleMerge = useCallback(async (entries: { data: ArrayBuffer; name: string }[]) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const { PDFDocument: PDFDoc } = await import('pdf-lib');
      const mergedDoc = await PDFDoc.create();
      for (const entry of entries) {
        const srcDoc = await PDFDoc.load(entry.data.slice(0), { ignoreEncryption: true });
        const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((p) => mergedDoc.addPage(p));
      }
      const mergedBytes = await mergedDoc.save();
      const buf = (mergedBytes.buffer.slice(
        mergedBytes.byteOffset, mergedBytes.byteOffset + mergedBytes.byteLength
      ) as ArrayBuffer);
      deselectAll();
      setCachedTOCItems(null);
      await loadPDFFromBytes(buf, 'merged.pdf');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, executing, deselectAll, loadPDFFromBytes, tool, showToast]);

  // ── Download current PDF ──────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!pdfBytes) return;
    const base = originalFileName?.replace(/\.pdf$/i, '') ?? fileName?.replace(/\.pdf$/i, '') ?? 'document';
    const downloadName = isModified ? `${base}_modified.pdf` : (fileName ?? `${base}.pdf`);
    downloadPDF(new Uint8Array(pdfBytes), downloadName);
  }, [pdfBytes, fileName, originalFileName, isModified]);

  // ── Selected pages summary (for modal display) ────────────

  const selectedPagesSummary = (() => {
    if (selectedCount === 0) return undefined;
    const arr = Array.from(selectedPages).sort((a, b) => a - b);
    if (arr.length <= 8) return arr.join(', ');
    const shown = arr.slice(0, 6).join(', ');
    return `${shown}... (+${arr.length - 6} more)`;
  })();

  // ── Page modal handlers ────────────────────────────────────

  const handleExtract = useCallback(async (pageNumbers: number[], options: ExtractOptions) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
      if (pages.length === 0) throw new Error('No pages to extract');

      const base = originalFileName?.replace(/\.pdf$/i, '') ?? fileName?.replace(/\.pdf$/i, '') ?? 'output';

      if (options.outputType === 'single') {
        downloadPDF(await extractPages(pdfBytes, pages), `${base}-extracted.pdf`);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < pages.length; i++) {
          const singleBytes = await extractPages(pdfBytes, [pages[i]]);
          const pad = String(i + 1).padStart(3, '0');
          zip.file(`${base}-p${pad}-page${pages[i]}.pdf`, singleBytes);
        }
        const zipBytes = await zip.generateAsync({ type: 'uint8array' });
        downloadZip(zipBytes, `${base}-extracted.zip`);
      }

      if (options.deleteAfter) {
        deselectAll();
        setTocLoading(true);
        const tocItems = pdf ? await getOutline(pdf) : undefined;
        setTocLoading(false);
        const result = await deletePages(pdfBytes, pages, tocItems);
        setCachedTOCItems(result.tocItems ?? null);
        await reloadPDF(result.bytes);
      }
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, fileName, originalFileName, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Insert / Replace handler (unified) ────────────────────

  const handleInsertReplace = useCallback(async (params: InsertReplaceParams) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      let result: { bytes: Uint8Array; tocItems?: TOCItem[] };
      if (params.operation === 'insert') {
        result = await insertPages(pdfBytes, params.sourceBytes, params.sourcePages, {
          location: params.location,
          page: params.targetPage,
        }, tocItems);
      } else {
        const pages = params.targetPages.length > 0 ? params.targetPages : Array.from(selectedPages);
        if (pages.length === 0) throw new Error('No target pages selected for replacement');
        result = await replacePages(pdfBytes, params.sourceBytes, pages, params.sourcePages, tocItems);
      }
      deselectAll();
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Delete handler ───────────────────────────────────────

  const handleDelete = useCallback(async (pageNumbers: number[]) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
      if (pages.length === 0) throw new Error('No pages to delete');
      deselectAll();
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      const result = await deletePages(pdfBytes, pages, tocItems);
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Copy / Move handler ──────────────────────────────────

  const handleCopyMove = useCallback(async (
    pageNumbers: number[],
    copies: number,
    location: 'before' | 'after',
    targetPage: number,
    operation: 'copy' | 'move',
  ) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
      if (pages.length === 0) throw new Error('No pages selected');
      deselectAll();
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      let result: { bytes: Uint8Array; tocItems?: TOCItem[] };
      if (operation === 'move') {
        result = await movePages(pdfBytes, pages, { location, page: targetPage }, tocItems);
      } else {
        result = await duplicatePages(pdfBytes, pages, copies, { location, page: targetPage }, tocItems);
      }
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Rotate handler ───────────────────────────────────────

  const handleRotate = useCallback(async (pageNumbers: number[], angle: RotationAngle) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
      if (pages.length === 0) throw new Error('No pages to rotate');
      deselectAll();
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      const result = await rotatePages(pdfBytes, pages, angle, tocItems);
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Reverse handler ──────────────────────────────────────

  const handleReverse = useCallback(async (pageNumbers: number[]) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const pages = pageNumbers.length > 0 ? pageNumbers : Array.from(selectedPages);
      deselectAll();
      setTocLoading(true);
      const tocItems = pdf ? await getOutline(pdf) : undefined;
      setTocLoading(false);
      const result = await reversePages(pdfBytes, pages.length > 0 ? pages : undefined, tocItems);
      setCachedTOCItems(result.tocItems ?? null);
      await reloadPDF(result.bytes);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, selectedPages, executing, deselectAll, reloadPDF, tool, pdf, showToast]);

  // ── Split handler ────────────────────────────────────────

  const handleSplit = useCallback(async (params: SplitParams) => {
    if (!pdfBytes) return;
    setExecuting(true);
    try {
      const base = fileName?.replace(/\.pdf$/i, '') ?? 'document';
      let zipBytes: Uint8Array;
      if (params.mode === 'customRanges' && params.ranges) {
        zipBytes = await splitByRanges(pdfBytes, params.ranges, base, params.filteredPages);
      } else if (params.mode === 'perMarkers' && params.markers) {
        zipBytes = await splitByMarkers(pdfBytes, params.markers, base, params.filteredPages);
      } else if (params.mode === 'perTOC' && params.tocDepth !== undefined && tocItemsForSplit && tocItemsForSplit.length > 0) {
        zipBytes = await splitByTOC(pdfBytes, tocItemsForSplit, params.tocDepth, base, params.filteredPages, params.onProgress);
      } else if (params.mode === 'perPage') {
        zipBytes = await splitPages(pdfBytes, 1, base, params.filteredPages);
      } else {
        const pagesPerChunk = params.mode === 'perPages' ? params.value : Math.ceil(numPages / params.value);
        zipBytes = await splitPages(pdfBytes, pagesPerChunk, base, params.filteredPages);
      }
      downloadZip(zipBytes, `${base}-split.zip`);
    } catch (err: any) {
      showToast('error', err.message);
      setTocLoading(false);
    } finally {
      setExecuting(false);
      tool.closePageModal();
    }
  }, [pdfBytes, fileName, numPages, executing, tool, pdf, tocItemsForSplit, showToast]);

  // ── TOC ────────────────────────────────────────────────────

  const handleTOCToggle = useCallback(() => setTocOpen((o) => !o), []);

  const handleTOCNavigate = useCallback((page: number) => {
    setScrollToPage(page);
    setTocOpen(false);
    if (mode === 'editor') setMode('viewer');
  }, [mode]);

  // ── View page from editor thumbnail ────────────────────────

  const handleViewPage = useCallback((page: number) => {
    setScrollToPage(page);
    setTocOpen(false);
    setMode('viewer');
  }, []);

  const handleCurrentPageChange = useCallback((page: number) => {
    lastViewerPageRef.current = page;
  }, []);

  const handleEditorFirstPageChange = useCallback((page: number) => {
    lastEditorFirstPageRef.current = page;
    setEditorCurrentPage(page);
  }, []);

  // ── Switch to Viewer preserving the editor's first visible page ──

  const handleSwitchToViewer = useCallback(() => {
    setScrollToPage(lastEditorFirstPageRef.current);
    setMode('viewer');
  }, []);

  // ── Render ─────────────────────────────────────────────────

  const hasPDF = pdf !== null && numPages > 0;

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.pdf.enc"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
        className="hidden" />

      {/* ── Top bar with mode toggle (always visible) ────────── */}
      <header className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        {/* App title */}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
            <path d="M8 12h8v2H8zm0 4h8v2H8z" fill="#18181b" />
          </svg>
          <span className="text-base font-bold text-zinc-100">PDF Toolkit</span>
        </div>

        <div className="w-px h-5 bg-zinc-700" />

        {/* Mode toggle */}
        <div className="flex items-center bg-zinc-800 rounded-md p-0.5 border border-zinc-700">
          <button
            onClick={handleSwitchToViewer}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'viewer' ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Viewer
          </button>
          <button
            onClick={() => setMode('editor')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'editor' ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editor
          </button>
        </div>

        {/* File info */}
        <div className="w-px h-5 bg-zinc-700" />
        {fileName ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="truncate max-w-[160px] font-medium">{fileName}</span>
            <span className="text-zinc-600 tabular-nums">({numPages.toLocaleString()})</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">No PDF loaded</span>
        )}

        {/* Viewer toolbar portal target */}
        <div id="viewer-toolbar-portal" style={{ display: mode === 'viewer' ? undefined : 'none' }} />

        {/* Editor toolbar portal target */}
        <div id="editor-toolbar-portal" style={{ display: mode === 'editor' ? undefined : 'none' }} />

        <div className="flex-1" />

        {/* Open button */}
        <button onClick={handleOpenFile}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2l-2-2H9L7 5H5a2 2 0 00-2 2z" />
          </svg>
          Open
        </button>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* TOC Panel */}
        {hasPDF && (
          <TOCPanel
            pdf={pdf!}
            open={tocOpen}
            onClose={() => setTocOpen(false)}
            onNavigate={handleTOCNavigate}
          />
        )}

        {/* ── VIEWER MODE (standalone) ────────────────────────── */}
        {hasPDF && mode === 'viewer' ? (
            <StandardViewer
              pdf={pdf!}
              numPages={numPages}
              pdfBytes={pdfBytes}
              fileName={fileName}
              onDownload={handleDownload}
              scrollToPage={scrollToPage}
              onCurrentPageChange={handleCurrentPageChange}
              tocOpen={tocOpen}
              onTOCToggle={handleTOCToggle}
            />
        ) : hasPDF && mode === 'editor' ? (
          /* ── EDITOR MODE (standalone) ──────────────────────── */
            <Editor
              pdf={pdf!}
              numPages={numPages}
              selectedPages={selectedPages}
              selectedCount={selectedCount}
              onTogglePage={togglePage}
              onRangeSelect={selectRange}
              onSelectAll={handleSelectAll}
              onDeselectAll={deselectAll}
              onOpenFile={handleOpenFile}
              onDownload={handleDownload}
              fileName={fileName}
              executing={executing}
              onOpenPageModal={handleOpenPageModal}
              onEnterReorder={handleEnterReorder}
              onOpenDocModal={handleOpenDocModal}
              onDocInstantAction={handleDocInstantAction}
              isReorderMode={tool.isReorderMode}
              pageOrder={reorder.pageOrder}
              onReorderApply={handleReorderApply}
              onReorderCancel={handleReorderCancel}
              onReorderMovePage={handleReorderMovePage}
              onReorderSwap={handleReorderSwap}
              onViewPage={handleViewPage}
              onFirstVisiblePageChange={handleEditorFirstPageChange}
              editorCurrentPage={editorCurrentPage}
              initialPage={lastViewerPageRef.current}
              tocOpen={tocOpen}
              onTOCToggle={handleTOCToggle}
            />
        ) : (
          /* ── No PDF loaded ─────────────────────────────────── */
          <PDFUploader onFileSelect={handleFileSelect} loading={loading} error={error} />
        )}
      </div>

      {/* TOC Loading Toast */}
      {tocLoading && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl shadow-2xl">
            <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm text-zinc-200 font-medium">Extracting table of contents...</span>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {tool.pageModalOpen === 'merge' && pdfBytes && (
        <MergeModal
          onClose={tool.closePageModal}
          onMerge={handleMerge}
          executing={executing}
        />
      )}

      {/* Compose Modal */}
      {tool.pageModalOpen === 'compose' && pdfBytes && (
        <ComposeModal
          onClose={tool.closePageModal}
          onCompose={handleCompose}
          executing={executing}
        />
      )}

      {/* Doc Tool Modals */}
      {doc.modalOpen === 'metadata' && pdfBytes && (
        <MetadataModal pdfBytes={pdfBytes} onApply={handleMetadataApply} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'watermark-text' && pdfBytes && (
        <WatermarkTextModal pdfBytes={pdfBytes} onApply={handleWatermarkTextApply} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'watermark-image' && pdfBytes && (
        <WatermarkImageModal pdfBytes={pdfBytes} onApply={handleWatermarkImageApply} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'page-numbers' && pdfBytes && (
        <PageNumbersModal pdfBytes={pdfBytes} onApply={handlePageNumbersApply} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'add-pages' && pdfBytes && (
        <AddPagesModal pdfBytes={pdfBytes} totalPages={numPages} onApply={handleAddPagesApply} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'info' && pdfBytes && (
        <InfoModal pdfBytes={pdfBytes} fileName={fileName ?? 'document.pdf'} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'encrypt' && (
        <CryptoModal mode="encrypt" onExecute={handleEncrypt} onClose={doc.closeModal} />
      )}
      {doc.modalOpen === 'decrypt' && (
        <CryptoModal mode="decrypt" onExecute={handleDecrypt} onClose={doc.closeModal} />
      )}

      {/* Page Tool Modals */}
      {tool.pageModalOpen === 'extract' && pdfBytes && (
        <ExtractModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          fileName={fileName}
          onClose={tool.closePageModal}
          onExtract={handleExtract}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'insertreplace' && pdfBytes && (
        <InsertReplaceModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          onClose={tool.closePageModal}
          onApply={handleInsertReplace}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'delete' && pdfBytes && (
        <DeleteModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          onClose={tool.closePageModal}
          onDelete={handleDelete}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'copymove' && pdfBytes && (
        <CopyMoveModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          onClose={tool.closePageModal}
          onCopyMove={handleCopyMove}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'rotate' && pdfBytes && (
        <RotateModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          onClose={tool.closePageModal}
          onRotate={handleRotate}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'reverse' && pdfBytes && (
        <ReverseModal
          numPages={numPages}
          currentPage={editorCurrentPage}
          selectedCount={selectedCount}
          selectedPagesSummary={selectedPagesSummary}
          onClose={tool.closePageModal}
          onReverse={handleReverse}
          executing={executing}
        />
      )}
      {tool.pageModalOpen === 'split' && pdfBytes && (
        <SplitModal
          numPages={numPages}
          fileName={fileName}
          tocItems={tocItemsForSplit}
          onClose={tool.closePageModal}
          onSplit={handleSplit}
          executing={executing}
        />
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} />

    </div>
  );
}

export default App;
