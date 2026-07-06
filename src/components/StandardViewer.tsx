import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PDFDocument } from '../lib/pdfRenderer';
import { renderPageToCanvas, getFirstPageDimensions, clearPageDimensionsCache } from '../lib/pdfRenderer';

type ViewMode = 'single' | 'double' | 'triple';

interface StandardViewerProps {
  pdf: PDFDocument;
  numPages: number;
  pdfBytes: ArrayBuffer | null;
  fileName: string | null;
  onDownload: () => void;
  scrollToPage?: number | null;
  onCurrentPageChange?: (page: number) => void;
  tocOpen: boolean;
  onTOCToggle: () => void;
}

const POOL_SIZE = 15;
const PAGE_GAP = 16;
const COL_GAP = 12;

interface PageSlot {
  canvas: HTMLCanvasElement;
  pageAssigned: number;
}

const LAYOUT_MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'single', label: 'Single', icon: 'M4 4h16v16H4z' },
  { id: 'double', label: 'Double', icon: 'M4 4h7v16H4z M13 4h7v16h-7z' },
  { id: 'triple', label: '3-Col', icon: 'M4 4h4v16H4z M10 4h4v16h-4z M16 4h4v16h-4z' },
];

// ── Helper: compute fit-to-width scale ─────────────────────
function fitScale(cw: number, cols: number, pageW: number): number {
  const pad = cols === 1 ? 64 : 0;
  return (cw - pad - (cols - 1) * COL_GAP) / (cols * pageW);
}

export function StandardViewer({ pdf, numPages, pdfBytes: _pdfBytes, fileName: _fileName, onDownload, scrollToPage, onCurrentPageChange, tocOpen, onTOCToggle }: StandardViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasPoolRef = useRef<PageSlot[]>([]);
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const renderingRef = useRef(false);
  const lastVisibleStartRef = useRef(-1);
  const lastVisibleEndRef = useRef(-1);
  const preservePageRef = useRef(1);
  const lastHandledScrollToPageRef = useRef<number | null>(null);
  const lastReportedPageRef = useRef(1);

  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'auto'>('width');
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(595);
  const [pageHeight, setPageHeight] = useState(842);
  const [containerWidth, setContainerWidth] = useState(800);
  const [loaded, setLoaded] = useState(false);

  const cols = viewMode === 'single' ? 1 : viewMode === 'double' ? 2 : 3;

  // ── Container width tracking ───────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [loaded]);

  // ── Initialize: get page dimensions ────────────────────────
  useEffect(() => {
    clearPageDimensionsCache();
    getFirstPageDimensions(pdf).then((dims) => {
      setScale(fitScale(containerWidth, cols, dims.width));
      setPageWidth(dims.width);
      setPageHeight(dims.height);
      setLoaded(true);
    });
    return () => { clearPageDimensionsCache(); };
  }, [pdf]);

  // ── Recompute scale on fit-width + resize ──────────────────(cols removed)
  useEffect(() => {
    if (!loaded || fitMode !== 'width') return;
    getFirstPageDimensions(pdf).then((dims) => {
      setScale(fitScale(containerWidth, cols, dims.width));
    });
  }, [containerWidth, fitMode, loaded, pdf]);

  // ── Derived: row height & total height ─────────────────────
  const totalRows = Math.ceil(numPages / cols);
  const rowH = pageHeight * scale + PAGE_GAP;
  const totalHeight = loaded ? totalRows * rowH : 0;

  // ── Canvas pool init / recreate ────────────────────────────
  useEffect(() => {
    if (!pageContainerRef.current) return;
    abortControllersRef.current.forEach(c => c.abort());
    abortControllersRef.current.clear();
    canvasPoolRef.current.forEach(s => s.canvas.remove());
    canvasPoolRef.current = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.display = 'none';
      canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
      canvas.style.background = '#fff';
      pageContainerRef.current.appendChild(canvas);
      canvasPoolRef.current.push({ canvas, pageAssigned: -1 });
    }
    scheduleRender();
  }, [loaded, scale, pageHeight, rotation, cols]);

  // ── Render scheduler ───────────────────────────────────────
  const scheduleRender = useCallback(() => {
    if (renderingRef.current) return;
    renderingRef.current = true;
    requestAnimationFrame(() => {
      renderingRef.current = false;
      doRender();
    });
  }, [scale, pageHeight, cols, numPages]);

  // ── Scroll handler ─────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !loaded) return;

    const scrollTop = scrollRef.current.scrollTop;
    const viewH = scrollRef.current.clientHeight;
    const rowH = pageHeight * scale + PAGE_GAP;
    const visibleRowStart = Math.max(0, Math.floor(scrollTop / rowH));
    const visibleRowEnd = Math.min(totalRows - 1, Math.ceil((scrollTop + viewH) / rowH));

    const visibleStartPage = visibleRowStart * cols;
    const visibleEndPage = Math.min(numPages - 1, (visibleRowEnd + 1) * cols - 1);

    const mid = scrollTop + viewH / 2;
    const midRow = Math.floor(mid / rowH);
    const midPage = midRow * cols + 1;
    const cp = Math.max(1, Math.min(midPage, numPages));
    setCurrentPage(cp);
    if (cp !== lastReportedPageRef.current) {
      lastReportedPageRef.current = cp;
      onCurrentPageChange?.(cp);
    }

    if (visibleStartPage !== lastVisibleStartRef.current || visibleEndPage !== lastVisibleEndRef.current) {
      lastVisibleStartRef.current = visibleStartPage;
      lastVisibleEndRef.current = visibleEndPage;
      scheduleRender();
    }
  }, [loaded, pageHeight, scale, totalRows, numPages, cols, scheduleRender]);

  // ── Core render: assign canvases to visible pages ──────────
  const doRender = useCallback(() => {
    if (!pageContainerRef.current || !scrollRef.current || !loaded) return;

    const scrollTop = scrollRef.current.scrollTop;
    const viewH = scrollRef.current.clientHeight;
    const rowH = pageHeight * scale + PAGE_GAP;
    const pageW = pageWidth * scale;
    const colStep = pageW + COL_GAP;
    const buffer = 1;

    const visibleRowStart = Math.max(0, Math.floor(scrollTop / rowH) - buffer);
    const visibleRowEnd = Math.min(totalRows - 1, Math.ceil((scrollTop + viewH) / rowH) + buffer);
    const visibleStartPage = visibleRowStart * cols;
    const visibleEndPage = Math.min(numPages - 1, (visibleRowEnd + 1) * cols - 1);

    const pool = canvasPoolRef.current;
    if (pool.length === 0) return;

    const visibleSet = new Set<number>();
    for (let i = visibleStartPage; i <= visibleEndPage; i++) visibleSet.add(i);

    const neededPages: number[] = [];
    for (let i = visibleStartPage; i <= visibleEndPage; i++) {
      if (!pool.some(s => s.pageAssigned === i)) neededPages.push(i);
    }

    const freeSlots = pool.filter(s => !visibleSet.has(s.pageAssigned));
    const inUse = new Set<number>();

    for (let si = 0; si < pool.length; si++) {
      if (visibleSet.has(pool[si].pageAssigned)) inUse.add(si);
    }

    let fi = 0;
    for (const pageIdx of neededPages) {
      if (fi >= freeSlots.length) break;
      const slot = freeSlots[fi++];

      const prevAbort = abortControllersRef.current.get(slot.pageAssigned);
      if (prevAbort) { prevAbort.abort(); abortControllersRef.current.delete(slot.pageAssigned); }

      slot.pageAssigned = pageIdx;
      const si = pool.indexOf(slot);
      if (si >= 0) inUse.add(si);

      const row = Math.floor(pageIdx / cols);
      const col = pageIdx % cols;
      slot.canvas.style.left = `${col * colStep}px`;
      slot.canvas.style.top = `${row * rowH}px`;
      slot.canvas.style.display = 'block';

      const ctrl = new AbortController();
      abortControllersRef.current.set(pageIdx, ctrl);
      renderPageToCanvas(pdf, pageIdx + 1, slot.canvas, scale, ctrl.signal).catch(() => {});
    }

    for (let si = 0; si < pool.length; si++) {
      if (!inUse.has(si)) pool[si].canvas.style.display = 'none';
    }
  }, [loaded, pageHeight, pageWidth, scale, totalRows, numPages, cols, pdf]);

  // ── Preserve page position on layout mode change ───────────
  useEffect(() => {
    if (!loaded || !scrollRef.current) return;
    const p = Math.max(1, Math.min(preservePageRef.current, numPages));
    const rowH = pageHeight * scale + PAGE_GAP;
    const row = Math.floor((p - 1) / cols);
    const target = row * rowH;
    // Defer to rAF so totalHeight has been committed to DOM,
    // preventing the browser from clamping scrollTop to stale totalHeight
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = target;
      setCurrentPage(p);
      if (p !== lastReportedPageRef.current) {
        lastReportedPageRef.current = p;
        onCurrentPageChange?.(p);
      }
    });
  }, [viewMode]);

  // ── Scroll-to-page (from TOC / editor View badge) ─────────
  useEffect(() => {
    if (scrollToPage == null || !loaded || !scrollRef.current) return;
    const p = Math.max(1, Math.min(scrollToPage, numPages));
    const rowH = pageHeight * scale + PAGE_GAP;
    const row = Math.floor((p - 1) / cols);
    const target = row * rowH;
    // Only skip if we're already at the correct position and same page
    if (scrollToPage === lastHandledScrollToPageRef.current &&
        Math.abs(scrollRef.current.scrollTop - target) < 2) return;
    lastHandledScrollToPageRef.current = scrollToPage;
    scrollRef.current.scrollTop = target;
    setCurrentPage(p);
    if (p !== lastReportedPageRef.current) {
      lastReportedPageRef.current = p;
      onCurrentPageChange?.(p);
    }
  }, [scrollToPage, loaded, cols, pageHeight, scale, numPages]);

  // ── Zoom controls ──────────────────────────────────────────
  const zoomIn  = useCallback(() => { setFitMode('auto'); setScale(s => Math.min(4.0, Math.round((s + 0.25) * 100) / 100)); }, []);
  const zoomOut = useCallback(() => { setFitMode('auto'); setScale(s => Math.max(0.1, Math.round((s - 0.25) * 100) / 100)); }, []);
  const fitWidth = useCallback(async () => {
    setFitMode('width');
    const dims = await getFirstPageDimensions(pdf);
    setScale(fitScale(containerWidth, cols, dims.width));
  }, [pdf, containerWidth, cols]);
  const fitPage = useCallback(async () => {
    setFitMode('auto');
    const dims = await getFirstPageDimensions(pdf);
    const pad = cols === 1 ? 64 : 0;
    const availW = containerWidth - pad;
    const availH = (scrollRef.current?.parentElement?.clientHeight ?? 800) - 32;
    setScale(Math.min((availW - (cols - 1) * COL_GAP) / (cols * dims.width), availH / dims.height));
  }, [pdf, containerWidth, cols]);
  const rotateCW  = useCallback(() => setRotation(r => (r + 90) % 360), []);
  const rotateCCW = useCallback(() => setRotation(r => (r + 270) % 360), []);

  // ── Page navigation ────────────────────────────────────────
  const goToPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(page, numPages));
    const rowH = pageHeight * scale + PAGE_GAP;
    const row = Math.floor((p - 1) / cols);
    if (scrollRef.current) scrollRef.current.scrollTop = row * rowH;
    setCurrentPage(p);
    if (p !== lastReportedPageRef.current) {
      lastReportedPageRef.current = p;
      onCurrentPageChange?.(p);
    }
  }, [numPages, pageHeight, scale, cols]);
  const prevPage = useCallback(() => goToPage(currentPage - cols), [currentPage, goToPage, cols]);
  const nextPage = useCallback(() => goToPage(currentPage + cols), [currentPage, goToPage, cols]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowDown':  e.preventDefault(); scrollRef.current?.scrollBy(0, 100); break;
        case 'ArrowUp':    e.preventDefault(); scrollRef.current?.scrollBy(0, -100); break;
        case 'PageDown':   e.preventDefault(); nextPage(); break;
        case 'PageUp':     e.preventDefault(); prevPage(); break;
        case 'Home':       e.preventDefault(); goToPage(1); break;
        case 'End':        e.preventDefault(); goToPage(numPages); break;
        case '+': case '=': e.preventDefault(); zoomIn(); break;
        case '-':          e.preventDefault(); zoomOut(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage, goToPage, numPages, zoomIn, zoomOut]);

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  const zoomPct = Math.round(scale * 100);
  const containerW = cols * pageWidth * scale + (cols - 1) * COL_GAP;

  const portalTarget = document.getElementById('viewer-toolbar-portal');

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

        {/* Layout mode */}
        <div className="flex items-center bg-zinc-800 rounded p-0.5 border border-zinc-700 shrink-0">
          {LAYOUT_MODES.map(lm => (
            <button key={lm.id} onClick={async () => {
                const newCols = lm.id === 'single' ? 1 : lm.id === 'double' ? 2 : 3;
                preservePageRef.current = currentPage;
                const dims = await getFirstPageDimensions(pdf);
                setViewMode(lm.id);
                setFitMode('width');
                setScale(fitScale(containerWidth, newCols, dims.width));
              }}
              className={`px-1 py-0.5 rounded transition-all ${viewMode === lm.id ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
              title={lm.label}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={lm.icon}/></svg>
            </button>
          ))}
        </div>
        <div className="w-px h-3.5 bg-zinc-700 shrink-0" />

        {/* Zoom */}
        <button onClick={zoomOut} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Zoom out">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14"/></svg>
        </button>
        <span className="text-[10px] tabular-nums font-mono text-zinc-300 min-w-[2.5rem] text-center cursor-pointer hover:text-white select-none shrink-0"
          onClick={() => setFitMode(fitMode === 'width' ? 'auto' : 'width')}
          title={fitMode === 'width' ? 'Fit width (click for manual)' : 'Click to fit width'}>
          {fitMode === 'width' ? 'Fit' : `${zoomPct}%`}
        </span>
        <button onClick={zoomIn} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Zoom in">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
        </button>
        <div className="w-px h-3.5 bg-zinc-700 shrink-0" />
        <button onClick={fitWidth} className={`p-0.5 rounded transition-colors shrink-0 ${fitMode === 'width' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`} title="Fit width">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
        </button>
        <button onClick={fitPage} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Fit page">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v2H6v4H4V4zm14 0h-6v2h4v4h2V4zM4 20h6v-2H6v-4H4v6zm14 0h-6v-2h4v-4h2v6z"/></svg>
        </button>
        <div className="w-px h-3.5 bg-zinc-700 shrink-0" />
        <button onClick={rotateCCW} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Rotate left">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
        </button>
        <button onClick={rotateCW} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Rotate right">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"/></svg>
        </button>
        <div className="flex-1" />
        {/* Page nav */}
        <button onClick={prevPage} disabled={currentPage <= 1} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 shrink-0" title="Previous">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-[10px] tabular-nums text-zinc-400 whitespace-nowrap select-none shrink-0">{currentPage} / {numPages}</span>
        <button onClick={nextPage} disabled={currentPage >= numPages} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 shrink-0" title="Next">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <PageJumpInput onGo={goToPage} numPages={numPages} />
        <button onClick={onDownload} className="p-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0" title="Download">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </button>
      </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {portalTarget && createPortal(toolbarNode, portalTarget)}

      {/* ─── Pages scroll area ─────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-zinc-900">
        <div
          ref={pageContainerRef}
          className="relative mx-auto"
          style={{
            width: containerW,
            height: totalHeight,
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
            transformOrigin: 'center top',
          }}
        />
      </div>
    </div>
  );
}

function PageJumpInput({ onGo, numPages }: { onGo: (p: number) => void; numPages: number }) {
  const [val, setVal] = useState('');
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= numPages) { onGo(n); setVal(''); }
    }
  };
  return (
    <input type="number" min={1} max={numPages} value={val}
      onChange={e => setVal(e.target.value)} onKeyDown={handleKey}
      placeholder={`1-${numPages}`}
      className="w-9 px-1 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-200 text-center focus:outline-none focus:border-blue-500 placeholder:text-zinc-600" />
  );
}
