import React, { createContext, useContext } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastContextValue {
  show(message: string, tone?: ToastTone, durationMs?: number): void;
  success(message: string, durationMs?: number): void;
  error(message: string, durationMs?: number): void;
  info(message: string, durationMs?: number): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = (
    _message: string,
    _tone: ToastTone = "info",
    _durationMs = 4000,
  ) => {};

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
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
