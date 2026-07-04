import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'received' | 'accepted' | 'released' | 'due';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (title: string, message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto-remove after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 items-end pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="pointer-events-auto p-4 bg-paper border-2 border-dashed border-ledger/30 shadow-[4px_4px_0px_rgba(27,58,36,0.1)] max-w-xs relative font-mono text-[11px] text-ink animate-toast-stamp bg-paper-light"
            style={{
              transform: 'rotate(-1.5deg)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-2 right-2 text-sage hover:text-seal transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Stamp Badge */}
            <div className="mb-2">
              <span className={`rubber-stamp font-extrabold ${
                toast.type === 'accepted' ? 'stamp-financed border-ledger text-ledger' :
                toast.type === 'received' ? 'stamp-approved border-ledger text-ledger' :
                'stamp-sealed border-seal text-seal'
              } text-[9px]`}>
                {toast.title.toUpperCase()}
              </span>
            </div>

            {/* Message */}
            <p className="text-ink-light font-sans text-xs leading-relaxed pr-4">
              {toast.message}
            </p>

            {/* Micro details */}
            <div className="mt-3 pt-2 border-t border-dashed border-sage/30 flex justify-between text-[8px] text-sage font-mono">
              <span>LEDGER SYSTEM EVENT</span>
              <span>SECURE HASH VERIFIED</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
