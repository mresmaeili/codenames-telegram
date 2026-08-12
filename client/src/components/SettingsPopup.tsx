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
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl rounded-4xl bg-[#0f172a] p-4 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto border border-white/10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <GameHeader compact title={title} playerCount={playerCount} />
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Close
          </button>
        </div>

        {/* Tabs removed — settings displayed via registered popup content only */}

        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
