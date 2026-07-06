import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PDFDocument, PageDimensions } from '../lib/pdfRenderer';
import { renderPageToCanvas, getFirstPageDimensions, clearPageDimensionsCache } from '../lib/pdfRenderer';

export type ViewMode = 'single' | 'double' | 'triple' | 'grid';

interface PDFViewerProps {
  pdf: PDFDocument;
  numPages: number;
  viewMode: ViewMode;
  zoomLevel: number; // percentage, e.g. 100 = actual size, 150 = 150%
  fitToWidth: boolean;
  gridColumns: number;
  scrollToPage?: number | null;
  onPageChange?: (page: number) => void;
}

const GAP = 12;
const ZOOM_STEP = 25;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

// Approximate A4 page size at 72 DPI (points)
const DEFAULT_PAGE: PageDimensions = { width: 595, height: 842 };

export function PDFViewer({
  pdf,
  numPages,
  viewMode,
  zoomLevel,
  fitToWidth,
  gridColumns,
  scrollToPage,
  onPageChange,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [firstPageDims, setFirstPageDims] = useState<PageDimensions>(DEFAULT_PAGE);
  const [loaded, setLoaded] = useState(false);

  // Track which page is currently visible (for onPageChange)
  const visiblePageRef = useRef(1);

  // Measure container width on mount/resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load first page dimensions
  useEffect(() => {
    clearPageDimensionsCache();
    getFirstPageDimensions(pdf).then((dims) => {
      setFirstPageDims(dims);
      setLoaded(true);
    });
    return () => { clearPageDimensionsCache(); };
  }, [pdf]);

  // ── Compute columns per row ───────────────────────────────
  const cols = useMemo(() => {
    switch (viewMode) {
      case 'single': return 1;
      case 'double': return 2;
      case 'triple': return 3;
      case 'grid': return Math.max(1, gridColumns);
    }
  }, [viewMode, gridColumns]);

  // ── Compute scale ─────────────────────────────────────────
  const pageScale = useMemo(() => {
    if (fitToWidth) {
      const gapSpace = (cols - 1) * GAP;
      const availableW = containerWidth - 48 - gapSpace; // 48px padding
      const targetW = cols === 1
        ? availableW
        : availableW / cols;
      return targetW / firstPageDims.width;
    }
    return zoomLevel / 100;
  }, [fitToWidth, zoomLevel, containerWidth, cols, firstPageDims.width]);

  // ── Page display dimensions ───────────────────────────────
  const pageDispW = firstPageDims.width * pageScale;
  const pageDispH = firstPageDims.height * pageScale;

  // ── Virtualization ────────────────────────────────────────
  const totalRows = Math.ceil(numPages / cols);

  const rowHeight = pageDispH + GAP;

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
  });

  // ── Scroll-to-page ────────────────────────────────────────
  useEffect(() => {
    if (scrollToPage == null || !loaded) return;
    const pageNum = Math.max(1, Math.min(scrollToPage, numPages));
    const rowIdx = Math.floor((pageNum - 1) / cols);
    virtualizer.scrollToIndex(rowIdx, { align: 'start' });
  }, [scrollToPage, loaded, cols, numPages, virtualizer]);

  // ── Track visible page ────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!onPageChange || !scrollRef.current) return;
    const { scrollTop, clientHeight } = scrollRef.current;
    const midPoint = scrollTop + clientHeight / 2;
    const rowAtMid = Math.floor(midPoint / rowHeight);
    const pageNum = rowAtMid * cols + 1;
    const clamped = Math.max(1, Math.min(pageNum, numPages));
    if (clamped !== visiblePageRef.current) {
      visiblePageRef.current = clamped;
      onPageChange(clamped);
    }
  }, [onPageChange, cols, numPages, rowHeight]);

  // ── Render ────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center" ref={containerRef}>
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-zinc-950">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-auto scrollbar-thin"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowIdx = virtualRow.index;
            const startPage = rowIdx * cols + 1;

            return (
              <div
                key={virtualRow.key}
                data-index={rowIdx}
                ref={virtualizer.measureElement}
                className="absolute left-0 right-0 flex justify-center"
                style={{
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  gap: `${GAP}px`,
                  paddingTop: rowIdx === 0 ? 24 : 0,
                  paddingBottom: rowIdx === totalRows - 1 ? 24 : 0,
                }}
              >
                {Array.from({ length: cols }, (_, colIdx) => {
                  const pageNum = startPage + colIdx;
                  if (pageNum > numPages) return null;
                  return (
                    <PageCanvas
                      key={pageNum}
                      pdf={pdf}
                      pageNumber={pageNum}
                      scale={pageScale}
                      width={pageDispW}
                      height={pageDispH}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PageCanvas sub-component ───────────────────────────────

const PageCanvas = memo(function PageCanvas({
  pdf,
  pageNumber,
  scale,
  width,
  height,
}: {
  pdf: PDFDocument;
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Composite key: page + scale to force re-render on zoom change
  const renderKey = pageNumber * 100000 + Math.round(scale * 10000);
  const renderedRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (renderedRef.current === renderKey) return;
    renderedRef.current = renderKey;

    // Cancel previous render
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    renderPageToCanvas(pdf, pageNumber, canvas, scale, controller.signal)
      .catch(() => { /* cancelled */ });

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div
      className="relative shrink-0 bg-white shadow-lg"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      {/* Page number badge */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-2 py-0.5 bg-zinc-800/90 border border-zinc-700 rounded-full">
        <span className="text-[10px] font-medium tabular-nums text-zinc-400">
          {pageNumber}
        </span>
      </div>
    </div>
  );
});

export { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM };
