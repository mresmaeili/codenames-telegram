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

      <div className="relative w-full max-w-full overflow-y-auto rounded-[26px] border-2 border-white/30 bg-[linear-gradient(180deg,#505050_0%,#252525_100%)] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_18px_50px_rgba(0,0,0,0.58)] sm:max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              {title ?? "Settings"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-white/5 text-2xl leading-none text-white transition hover:bg-white/15 active:scale-95"
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
