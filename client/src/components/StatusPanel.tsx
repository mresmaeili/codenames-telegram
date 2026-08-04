import type { ReactNode } from "react";

interface StatusPanelProps {
  title: string;
  description: string;
  tone?: "info" | "success" | "error";
  children?: ReactNode;
}

export function StatusPanel({
  title,
  description,
  tone = "info",
  children,
}: StatusPanelProps) {
  const toneClasses = {
    info: "border-(--app-border) bg-(--app-background)/70 text-(--app-text)",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  }[tone];

  const dotClasses = {
    info: "bg-(--app-accent)",
    success: "bg-emerald-400",
    error: "bg-rose-400",
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-4 shadow-sm ${toneClasses}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses}`}
        />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm leading-6 opacity-90">{description}</p>
          {children ? <div className="pt-2">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
