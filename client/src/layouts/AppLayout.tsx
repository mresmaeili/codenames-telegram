import type { PropsWithChildren } from "react";

import { DevToolbar } from "@/components/DevToolbar";
import { SettingsPopup } from "@/components/SettingsPopup";
import {
  HeaderPopupProvider,
  useHeaderPopup,
} from "@/context/HeaderPopupContext";

function HeaderControls() {
  // Keep header controls minimal; popup is rendered separately so it's not
  // constrained by the header's layout/stacking context.
  return (
    <div className="flex w-full items-center justify-between">
      <div />
    </div>
  );
}

function PopupRenderer() {
  const { open, title, closePopup, content } = useHeaderPopup();
  return (
    <SettingsPopup
      open={open}
      title={title}
      onClose={closePopup}
      playerCount={undefined}
    >
      {content}
    </SettingsPopup>
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

          {/* Render popup outside the header so fixed centering works correctly */}
          <PopupRenderer />

          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          <DevToolbar />
        </div>
      </div>
    </HeaderPopupProvider>
  );
}
