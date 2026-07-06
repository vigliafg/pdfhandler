import { useState, useEffect } from 'react';
import type { PDFDocument, TOCItem } from '../lib/pdfRenderer';
import { getOutline } from '../lib/pdfRenderer';

interface TOCPanelProps {
  pdf: PDFDocument;
  open: boolean;
  onClose: () => void;
  onNavigate: (pageNumber: number) => void;
}

export function TOCPanel({ pdf, open, onClose, onNavigate }: TOCPanelProps) {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getOutline(pdf)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load outline'))
      .finally(() => setLoading(false));
  }, [pdf, open]);

  if (!open) return null;

  return (
    <div className="absolute left-0 top-0 bottom-0 z-40 flex">
      {/* Panel */}
      <div className="w-72 h-full bg-zinc-900 border-r border-zinc-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-sm font-semibold text-zinc-200">Contents</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto py-2">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <p className="px-4 py-3 text-xs text-red-400">{error}</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="px-4 py-3 text-xs text-zinc-500 italic">No table of contents found.</p>
          )}
          {!loading && items.length > 0 && (
            <TOCTree items={items} onNavigate={onNavigate} depth={0} />
          )}
        </div>
      </div>

      {/* Backdrop overlay to close panel */}
      <div
        className="w-[200vw] h-full bg-transparent"
        onClick={onClose}
      />
    </div>
  );
}

// ─── Recursive TOC tree ─────────────────────────────────────

function TOCTree({
  items,
  onNavigate,
  depth,
}: {
  items: TOCItem[];
  onNavigate: (page: number) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <ul className="flex flex-col">
      {items.map((item, idx) => {
        const key = depth * 1000 + idx;
        const hasChildren = item.children.length > 0;
        const isExpanded = expanded.has(key);

        return (
          <li key={key}>
            <button
              onClick={() => {
                if (hasChildren) {
                  toggleExpand(key);
                } else if (item.pageNumber) {
                  onNavigate(item.pageNumber);
                }
              }}
              className="flex items-center gap-1 w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors group"
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {/* Expand/collapse arrow */}
              <span className="w-3.5 shrink-0 flex items-center justify-center">
                {hasChildren && (
                  <svg
                    className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </span>

              {/* Item text */}
              <span className={`truncate ${item.pageNumber ? 'group-hover:text-zinc-100' : 'text-zinc-500 italic'}`}>
                {item.title || '(untitled)'}
              </span>

              {/* Page number — clickable even for parent items */}
              {item.pageNumber && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(item.pageNumber!);
                  }}
                  className="ml-auto text-[10px] tabular-nums text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 px-1 py-0.5 rounded shrink-0 transition-colors"
                  title={`Go to page ${item.pageNumber}`}
                >
                  {item.pageNumber}
                </button>
              )}
            </button>

            {/* Children */}
            {hasChildren && isExpanded && (
              <TOCTree items={item.children} onNavigate={onNavigate} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
