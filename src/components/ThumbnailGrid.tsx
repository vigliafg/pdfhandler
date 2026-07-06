import { useRef, useMemo, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PDFDocument } from '../lib/pdfRenderer';
import { Thumbnail } from './Thumbnail';

interface ThumbnailGridProps {
  pdf: PDFDocument;
  numPages: number;
  columns: number;
  selectedPages: Set<number>;
  onTogglePage: (pageNum: number) => void;
  onRangeSelect: (start: number, end: number) => void;
  onViewPage?: (pageNum: number) => void;
  onFirstVisiblePageChange?: (page: number) => void;
  initialPage?: number;
  // Reorder mode
  isReorderMode?: boolean;
  pageOrder?: number[];
  onMovePage?: (fromIndex: number, toIndex: number) => void;
}

const MIN_THUMB_WIDTH = 60;
const LABEL_HEIGHT = 24;
const VERTICAL_PAD = 12; // padding above/below each row

export function ThumbnailGrid({
  pdf,
  numPages,
  columns,
  selectedPages,
  onTogglePage,
  onRangeSelect,
  onViewPage,
  onFirstVisiblePageChange,
  initialPage,
  isReorderMode = false,
  pageOrder = [],
  onMovePage,
}: ThumbnailGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // ── Dynamic thumbnail width based on viewport size ─────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ── Reorder drag state ─────────────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleReorderDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleReorderDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  }, [dragIndex]);

  const handleReorderDrop = useCallback((index: number) => {
    if (dragIndex !== null && dragIndex !== index && onMovePage) {
      onMovePage(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, onMovePage]);

  const handleReorderDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // ── Thumbnail width: fill exactly viewport width, no gaps ─
  const thumbWidth = useMemo(() => {
    const w = Math.floor(containerSize.width / columns);
    return Math.max(MIN_THUMB_WIDTH, w);
  }, [containerSize, columns]);

  const thumbnailHeight = thumbWidth * (297 / 210);
  const rowHeight = thumbnailHeight + LABEL_HEIGHT + VERTICAL_PAD;
  const totalRows = Math.ceil(numPages / columns);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });

  // Pre-compute the items for each row to avoid repeated calculations
  const rowItems = useMemo(() => {
    const items: number[][] = [];
    for (let row = 0; row < totalRows; row++) {
      const start = row * columns + 1;
      const end = Math.min(start + columns - 1, numPages);
      const pages: number[] = [];
      for (let p = start; p <= end; p++) {
        pages.push(p);
      }
      items.push(pages);
    }
    return items;
  }, [totalRows, numPages, columns]);

  // ── Scroll to initial page on mount ──
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (initialPage == null || didInitialScrollRef.current || containerSize.width === 0 || !scrollRef.current) return;
    const row = Math.floor((initialPage - 1) / columns);
    didInitialScrollRef.current = true;
    const timer = setTimeout(() => {
      virtualizer.scrollToIndex(row, { align: 'start' });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialPage, columns, containerSize.width, virtualizer]);

  // ── Report first visible page on scroll ───────────────────
  const lastReportedFirstPageRef = useRef(0);
  // Anchor page for preserving scroll position when columns change
  const anchorPageRef = useRef(initialPage ?? 1);

  // Store callback in ref to keep the scroll handler stable
  const onFirstVisiblePageChangeRef = useRef(onFirstVisiblePageChange);
  onFirstVisiblePageChangeRef.current = onFirstVisiblePageChange;

  const handleGridScroll = useCallback(() => {
    if (!scrollRef.current || !onFirstVisiblePageChangeRef.current || containerSize.width === 0) return;
    const scrollTop = scrollRef.current.scrollTop;
    const firstRow = Math.floor(scrollTop / rowHeight);
    const firstPage = Math.max(1, firstRow * columns + 1);
    anchorPageRef.current = firstPage;
    if (firstPage !== lastReportedFirstPageRef.current) {
      lastReportedFirstPageRef.current = firstPage;
      onFirstVisiblePageChangeRef.current(firstPage);
    }
  }, [rowHeight, columns, containerSize.width]);

  // ── Preserve scroll position when columns change ──────────
  const prevColumnsRef = useRef(columns);
  // Compute target scrollTop and row during render phase while anchorPageRef
  // is still correct (before the browser clamps scrollTop on DOM commit
  // and fires a scroll event that would corrupt it).
  const pendingScrollRef = useRef<number | null>(null);
  const pendingRowRef = useRef(0);
  if (prevColumnsRef.current !== columns && containerSize.width > 0) {
    const row = Math.floor((anchorPageRef.current - 1) / columns);
    // Point to middle of target row — maximises tolerance against floating-point
    // imprecision (A4 ratio 297/210) and ResizeObserver-induced rowHeight shifts.
    pendingScrollRef.current = row * rowHeight + rowHeight / 2;
    pendingRowRef.current = row;
  }
  // Apply the pending scroll synchronously before paint via useLayoutEffect.
  // Use pendingRowRef (saved during render, before corruption) to compute
  // the correct anchorPage — not anchorPageRef.current which may already
  // have been overwritten by the browser-clamp scroll event.
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = pendingScrollRef.current;
      anchorPageRef.current = pendingRowRef.current * columns + 1;
      pendingScrollRef.current = null;
      prevColumnsRef.current = columns;
    }
  }, [columns, containerSize.width]);

  // Track the last clicked page for range selection (shift+click)
  const lastClickedRef = useRef<number | null>(null);

  // Store callbacks in refs so handleToggle stays stable across renders
  const onTogglePageRef = useRef(onTogglePage);
  onTogglePageRef.current = onTogglePage;
  const onRangeSelectRef = useRef(onRangeSelect);
  onRangeSelectRef.current = onRangeSelect;

  const handleToggle = useCallback((pageNum: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedRef.current !== null) {
      onRangeSelectRef.current(lastClickedRef.current, pageNum);
    } else {
      onTogglePageRef.current(pageNum);
    }
    lastClickedRef.current = pageNum;
  }, []);

  // ── Reorder mode ───────────────────────────────────────────
  if (isReorderMode) {
    const REORDER_ITEM_HEIGHT = 80;
    const REORDER_GAP = 4;

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto scrollbar-thin"
      >
        <div
          style={{
            height: `${pageOrder.length * (REORDER_ITEM_HEIGHT + REORDER_GAP)}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {pageOrder.map((pageNum, idx) => {
            const isDragging = dragIndex === idx;
            const isOver = dragOverIndex === idx && dragIndex !== idx;

            return (
              <div
                key={`${idx}-${pageNum}`}
                draggable
                onDragStart={() => handleReorderDragStart(idx)}
                onDragOver={(e) => handleReorderDragOver(e, idx)}
                onDrop={() => handleReorderDrop(idx)}
                onDragEnd={handleReorderDragEnd}
                className={`absolute left-0 right-0 flex items-center gap-3 px-4 py-1.5 cursor-grab active:cursor-grabbing transition-colors rounded-lg select-none ${
                  isDragging
                    ? 'opacity-30 bg-zinc-800'
                    : isOver
                      ? 'bg-amber-500/10 border-t-2 border-amber-400'
                      : 'hover:bg-zinc-800/50'
                }`}
                style={{
                  top: `${idx * (REORDER_ITEM_HEIGHT + REORDER_GAP)}px`,
                  height: REORDER_ITEM_HEIGHT,
                }}
              >
                {/* Drag handle */}
                <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                </svg>

                {/* Page number badge */}
                <span className="w-10 text-center text-xs font-semibold text-zinc-500 tabular-nums shrink-0">
                  #{pageNum}
                </span>

                {/* Position indicator */}
                <span className="text-[10px] text-zinc-600 tabular-nums ml-auto shrink-0">
                  pos {idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Normal grid mode ───────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      onScroll={handleGridScroll}
      className="flex-1 overflow-auto scrollbar-thin"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 right-0 flex"
            style={{
              top: 0,
              transform: `translateY(${virtualRow.start}px)`,
              paddingLeft: 0,
              paddingRight: 0,
              gap: 0,
              justifyContent: 'flex-start',
            }}
          >
            {rowItems[virtualRow.index]?.map((pageNum) => (
              <div
                key={pageNum}
                style={{ width: thumbWidth, flexShrink: 0 }}
              >
                <Thumbnail
                  pdf={pdf}
                  pageNumber={pageNum}
                  selected={selectedPages.has(pageNum)}
                  onToggle={(shiftKey: boolean) => handleToggle(pageNum, shiftKey)}
                  onViewPage={onViewPage}
                  targetWidth={thumbWidth}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
