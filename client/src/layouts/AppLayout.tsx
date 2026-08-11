import type { PropsWithChildren } from "react";

import { DevToolbar } from "@/components/DevToolbar";
import { SettingsPopup } from "@/components/SettingsPopup";
import {
  HeaderPopupProvider,
  useHeaderPopup,
} from "@/context/HeaderPopupContext";

function HeaderControls() {
  const { hasContent, openPopup, open, closePopup, content, title } =
    useHeaderPopup();
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div />

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open room settings"
            disabled={!hasContent}
            onClick={openPopup}
            className="rounded-full border border-(--app-border) bg-(--app-surface) p-2 text-(--app-muted) disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⚙
          </button>
        </div>

        <SettingsPopup
          open={open}
          title={title}
          onClose={closePopup}
          playerCount={undefined}
        >
          {content}
        </SettingsPopup>
      </div>
    </>
  );
}

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <HeaderPopupProvider>
      <div className="min-h-screen bg-(--app-bg) text-(--app-text)">
        <div className="flex min-h-screen flex-col overflow-hidden">
          <header className="fixed top-0 left-0 right-0 z-40 border-b border-(--app-border) bg-(--app-bg)/98 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-full items-center justify-between px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <HeaderControls />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          <DevToolbar />
        </div>
      </div>
    </HeaderPopupProvider>
  );
}
