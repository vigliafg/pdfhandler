import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastData['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { id, type, message }]); // max 3 visibili
    const duration = type === 'error' ? 6000 : 4000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return { toasts, showToast };
}

const iconMap: Record<ToastData['type'], string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const borderMap: Record<ToastData['type'], string> = {
  success: 'border-emerald-500/50 bg-emerald-500/10',
  error: 'border-red-500/50 bg-red-500/10',
  info: 'border-blue-500/50 bg-blue-500/10',
};

const textMap: Record<ToastData['type'], string> = {
  success: 'text-emerald-200',
  error: 'text-red-200',
  info: 'text-blue-200',
};

const iconColorMap: Record<ToastData['type'], string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

export function Toast({ toasts }: { toasts: ToastData[] }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm animate-slide-up ${borderMap[toast.type]}`}
          style={{
            opacity: i < toasts.length - 1 ? 0.85 : 1,
          }}
        >
          <svg
            className={`w-4 h-4 shrink-0 mt-px ${iconColorMap[toast.type]}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[toast.type]} />
          </svg>
          <span className={`text-sm ${textMap[toast.type]}`}>{toast.message}</span>
        </div>
      ))}
    </div>,
    document.getElementById('toast-portal')!,
  );
}
