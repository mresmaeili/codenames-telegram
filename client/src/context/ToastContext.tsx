import React, { createContext, useCallback, useContext, useState } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show(message: string, tone?: ToastTone, durationMs?: number): void;
  success(message: string, durationMs?: number): void;
  error(message: string, durationMs?: number): void;
  info(message: string, durationMs?: number): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info", durationMs = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast: ToastItem = { id, message, tone };
      setToasts((current) => [toast, ...current]);
      setTimeout(() => remove(id), durationMs);
    },
    [remove],
  );

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-auto flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-200 ${
              t.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.tone === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export default ToastProvider;
