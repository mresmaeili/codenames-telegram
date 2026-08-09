import { Fragment } from "react";
import { GameHeader } from "@/components/GameHeader";

interface SettingsPopupProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  playerCount?: number;
}

export function SettingsPopup({
  open,
  title,
  onClose,
  children,
  playerCount,
}: SettingsPopupProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-4xl bg-[var(--app-background)] p-3 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <GameHeader compact title={title} playerCount={playerCount} />
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="ml-3 rounded-full bg-[var(--app-surface)] px-3 py-2 text-sm text-[color:var(--app-muted)]"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
