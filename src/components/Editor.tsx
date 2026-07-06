import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PDFDocument } from '../lib/pdfRenderer';
import { ThumbnailGrid } from './ThumbnailGrid';
import { TOOLS, type PageModalId } from '../hooks/useToolState';
import { DOC_TOOLS, type DocToolId } from '../hooks/useDocToolState';

interface EditorProps {
  pdf: PDFDocument;
  numPages: number;
  selectedPages: Set<number>;
  selectedCount: number;
  onTogglePage: (pageNum: number) => void;
  onRangeSelect: (start: number, end: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenFile: () => void;
  onDownload: () => void;
  fileName: string | null;
  executing: boolean;
  // Immediate tool actions from dropdown
  onOpenPageModal: (id: PageModalId) => void;
  onEnterReorder: () => void;
  onOpenDocModal: (id: DocToolId) => void;
  onDocInstantAction: (id: DocToolId) => void;
  // Reorder mode
  isReorderMode: boolean;
  pageOrder: number[];
  onReorderApply: () => void;
  onReorderCancel: () => void;
  onReorderMovePage?: (fromIndex: number, toIndex: number) => void;
  onReorderSwap?: (pageA: number, pageB: number) => void;
  onViewPage?: (pageNum: number) => void;
  onFirstVisiblePageChange?: (page: number) => void;
  editorCurrentPage: number;
  initialPage?: number;
  tocOpen: boolean;
  onTOCToggle: () => void;
}

export function Editor({
  pdf,
  numPages,
  selectedPages,
  selectedCount,
  onTogglePage,
  onRangeSelect,
  onSelectAll,
  onDeselectAll,
  onOpenFile,
  onDownload,
  fileName,
  executing,
  onOpenPageModal,
  onEnterReorder,
  onOpenDocModal,
  onDocInstantAction,
  isReorderMode = false,
  pageOrder = [],
  onReorderApply,
  onReorderCancel,
  onReorderMovePage,
  onReorderSwap,
  onViewPage,
  onFirstVisiblePageChange,
  editorCurrentPage,
  initialPage,
  tocOpen,
  onTOCToggle,
}: EditorProps) {
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [columns, setColumns] = useState(5);

  const [swapPageA, setSwapPageA] = useState('');
  const [swapPageB, setSwapPageB] = useState('');

  const swapANum = parseInt(swapPageA, 10);
  const swapBNum = parseInt(swapPageB, 10);
  const canReorderSwap =
    !isNaN(swapANum) && swapANum >= 1 && swapANum <= numPages &&
    !isNaN(swapBNum) && swapBNum >= 1 && swapBNum <= numPages &&
    swapANum !== swapBNum;

  const handleReorderSwap = useCallback(() => {
    if (!canReorderSwap || !onReorderSwap) return;
    onReorderSwap(swapANum, swapBNum);
    setSwapPageA('');
    setSwapPageB('');
  }, [canReorderSwap, onReorderSwap, swapANum, swapBNum]);

  useEffect(() => {
    if (isReorderMode) {
      setSwapPageA('');
      setSwapPageB('');
    }
  }, [isReorderMode]);

  const handleDownloadClick = useCallback(() => {
    if (fileName) setShowDownloadConfirm(true);
  }, [fileName]);

  const confirmDownload = useCallback(() => {
    setShowDownloadConfirm(false);
    onDownload();
  }, [onDownload]);

  const portalTarget = document.getElementById('editor-toolbar-portal');

  // ── Unified dropdown state ────────────────────────────────────
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Click a page tool: immediate open modal or enter reorder
  const selectPageTool = useCallback(
    (id: typeof TOOLS[number]['id']) => {
      setOpen(false);
      if (id === 'reorder') {
        onEnterReorder();
      } else {
        onOpenPageModal(id as PageModalId);
      }
    },
    [onEnterReorder, onOpenPageModal],
  );

  // Click a doc tool: immediate open modal or instant action
  const selectDocTool = useCallback(
    (id: DocToolId) => {
      setOpen(false);
      const def = DOC_TOOLS.find((t) => t.id === id);
      if (def?.needsModal) {
        onOpenDocModal(id);
      } else {
        onDocInstantAction(id);
      }
    },
    [onOpenDocModal, onDocInstantAction],
  );

  const toolbarNode = (
    <div className="flex items-center gap-1">
      {/* TOC toggle */}
      <button onClick={onTOCToggle}
        className={`p-0.5 rounded transition-colors shrink-0 ${tocOpen ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
        title="Table of Contents">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
      <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

      {/* ── Open ────────────────────────────────────────── */}
      <button onClick={onOpenFile}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0"
        title="Open PDF">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2l-2-2H9L7 5H5a2 2 0 00-2 2z" />
        </svg>
        Open
      </button>

      {/* ── Save ────────────────────────────────────────── */}
      <button onClick={handleDownloadClick}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0"
        title="Save PDF">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Save
      </button>

      <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

      {/* ── Unified Tools Dropdown ──────────────────────── */}
      {!isReorderMode && (
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 rounded transition-colors hover:text-zinc-200 hover:bg-zinc-800"
            title="Tools"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tools
            <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              {/* ── Page Tools section ── */}
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1">
                Page Tools
              </div>
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectPageTool(t.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] transition-colors text-left text-zinc-300 hover:bg-zinc-700"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}

              <div className="border-t border-zinc-700 my-1" />

              {/* ── Document Tools section ── */}
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1">
                Document Tools
              </div>
              {DOC_TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectDocTool(t.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] transition-colors text-left text-zinc-300 hover:bg-zinc-700"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reorder mode controls ────────────────────────── */}
      {isReorderMode ? (
        <>
          <span className="text-[10px] text-amber-400 font-medium shrink-0">
            Reorder
          </span>

          <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

          {/* Quick Swap */}
          <input
            type="number"
            min={1}
            max={numPages}
            value={swapPageA}
            onChange={(e) => setSwapPageA(e.target.value)}
            placeholder="A"
            className="w-12 px-1.5 py-0.5 text-[10px] font-mono text-center bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 shrink-0"
          />
          <svg className="w-3 h-3 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <input
            type="number"
            min={1}
            max={numPages}
            value={swapPageB}
            onChange={(e) => setSwapPageB(e.target.value)}
            placeholder="B"
            className="w-12 px-1.5 py-0.5 text-[10px] font-mono text-center bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 shrink-0"
          />
          <button
            onClick={handleReorderSwap}
            disabled={!canReorderSwap}
            className="px-2 py-0.5 text-[10px] font-medium text-amber-300 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Swap these two pages"
          >
            Swap
          </button>

          <div className="w-px h-3.5 bg-zinc-700 shrink-0" />
          <button
            onClick={onReorderCancel}
            className="px-2 py-0.5 text-[10px] font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors shrink-0"
          >
            Cancel
          </button>
          <button
            onClick={onReorderApply}
            disabled={executing}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:text-amber-300 disabled:cursor-not-allowed rounded transition-all shadow-sm shadow-amber-500/20 shrink-0"
          >
            {executing ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Order'
            )}
          </button>
        </>
      ) : null}

      <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

      {/* ── Columns toggle ────────────────────────────────── */}
      {!isReorderMode && (
        <div className="flex items-center bg-zinc-800 rounded p-0.5 border border-zinc-700 shrink-0">
          {([3, 4, 5, 6] as const).map((n) => (
            <button
              key={n}
              onClick={() => setColumns(n)}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-all ${
                columns === n ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {!isReorderMode && (
        <>
          <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

          {/* ── Selection ──────────────────────────────────── */}
          {selectedCount > 0 && (
            <span className="text-[10px] text-blue-400 font-medium tabular-nums shrink-0">{selectedCount} sel.</span>
          )}
          <button onClick={onSelectAll}
            className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors shrink-0">
            All
          </button>
          <button onClick={onDeselectAll} disabled={selectedCount === 0}
            className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            None
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* ── Current page indicator ─────────────────────────── */}
      <span className="text-[10px] tabular-nums text-zinc-400 whitespace-nowrap select-none shrink-0">
        {editorCurrentPage.toLocaleString()} / {numPages.toLocaleString()}
      </span>

      {/* Download confirmation modal */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <p className="text-zinc-200 font-semibold">Download PDF?</p>
                <p className="text-zinc-400 text-sm">Save the current document as <span className="text-blue-400 font-medium">{fileName}</span></p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDownloadConfirm(false)} className="px-4 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDownload} className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {portalTarget && createPortal(toolbarNode, portalTarget)}
      <ThumbnailGrid
        pdf={pdf}
        numPages={numPages}
        selectedPages={selectedPages}
        onTogglePage={onTogglePage}
        onRangeSelect={onRangeSelect}
        onViewPage={onViewPage}
        onFirstVisiblePageChange={onFirstVisiblePageChange}
        columns={columns}
        initialPage={initialPage}
        isReorderMode={isReorderMode}
        pageOrder={pageOrder}
        onMovePage={onReorderMovePage}
      />
    </div>
  );
}
