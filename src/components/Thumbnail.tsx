import { memo, useRef, useEffect, useCallback, useState } from 'react';
import type { PDFDocument } from '../lib/pdfRenderer';
import { renderPageToCanvas } from '../lib/pdfRenderer';

interface ThumbnailProps {
  pdf: PDFDocument;
  pageNumber: number;
  selected: boolean;
  onToggle: (shiftKey: boolean) => void;
  onViewPage?: (pageNum: number) => void;
  targetWidth: number;
}

export const Thumbnail = memo(function Thumbnail({
  pdf,
  pageNumber,
  selected,
  onToggle,
  onViewPage,
  targetWidth,
}: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [renderError, setRenderError] = useState(false);

  // Compute scale to match targetWidth based on the first page's viewport
  // (A4 at 72 DPI = ~595 points wide → scale = targetWidth/595 ≈ 0.285)
  const scale = targetWidth / 595;

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRenderError(false);

    // Cancel any in-flight render
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await renderPageToCanvas(pdf, pageNumber, canvas, scale, controller.signal);
    } catch (err) {
      if (err instanceof Error && err.name === 'RenderingCancelledException') return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn(`Failed to render page ${pageNumber}:`, err);
      if (!controller.signal.aborted) {
        setRenderError(true);
      }
    }
  }, [pdf, pageNumber, scale]);

  // Render when the component mounts or page changes
  useEffect(() => {
    render();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [render]);

  const handleClick = (e: React.MouseEvent) => {
    onToggle(e.shiftKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(e.shiftKey);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex flex-col items-center cursor-pointer
        transition-all duration-150 ease-out
        rounded-lg p-1.5
        ${
          selected
            ? 'bg-blue-500/20 ring-2 ring-blue-400 shadow-lg shadow-blue-500/30'
            : 'bg-transparent hover:bg-zinc-800/60 ring-1 ring-transparent hover:ring-zinc-700'
        }
      `}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Canvas wrapper with aspect ratio placeholder */}
      <div
        className="relative overflow-hidden rounded shadow-md bg-white"
        style={{ width: targetWidth, aspectRatio: '210 / 297' }}
      >
        {renderError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-200 text-zinc-500 gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-xs font-medium">Render failed</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="block w-full h-full object-contain"
          />
        )}

        {/* Page number badge (top-left, visible on hover) */}
        <div
          className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white bg-black/50 rounded-br opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        >
          {pageNumber}
        </div>

        {/* View page badge (top-center, visible on hover) */}
        {onViewPage && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewPage(pageNumber); }}
            className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600/80 hover:bg-blue-500 rounded-b opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 z-10"
            title="View page in viewer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
        )}

        {/* Selection overlay */}
        <div
          className={`
            absolute inset-0 transition-colors duration-150 pointer-events-none
            ${selected ? 'bg-blue-500/10' : 'bg-transparent group-hover:bg-zinc-900/5'}
          `}
        />

        {/* Check icon in corner when selected */}
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

    </div>
  );
});
