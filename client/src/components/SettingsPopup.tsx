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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-full sm:max-w-xl overflow-y-auto rounded-2xl border-2 border-white/35 bg-gradient-to-b from-[#5a5a5a] to-[#242424] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.1),0_12px_30px_rgba(0,0,0,0.45)] max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-4rem)]">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
              Codenames
            </p>
            <h2 className="truncate text-xl font-black uppercase text-white">
              {title ?? "Settings"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-white/10 text-2xl leading-none text-white transition hover:bg-white/15"
          >
            ×
          </button>
        </div>

        {/* Tabs removed — settings displayed via registered popup content only */}

        <div className="space-y-3 sm:space-y-4">{children}</div>
      </div>
    </div>
  );
}
