import type { PropsWithChildren } from "react";

import { env } from "@/config/env";
import { DevToolbar } from "@/components/DevToolbar";
import {
  HeaderPopupProvider,
  useHeaderPopup,
} from "@/context/HeaderPopupContext";
import { SettingsPopup } from "@/components/SettingsPopup";

function HeaderControls() {
  const { hasContent, openPopup, open, closePopup, content, title } =
    useHeaderPopup();
  return (
    <>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-[0.24em] text-[color:var(--app-muted)] uppercase">
            Codenames
          </span>
          <span className="text-xs text-[color:var(--app-muted)]">
            {env.APP_NAME}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open room settings"
            disabled={!hasContent}
            onClick={openPopup}
            className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] p-2 text-[color:var(--app-muted)] disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="min-h-screen bg-[var(--app-bg)] text-[color:var(--app-text)]">
        <div className="flex min-h-screen flex-col overflow-hidden">
          <header className="fixed top-0 left-0 right-0 z-40 border-b border-[color:var(--app-border)] bg-[var(--app-bg)]/98 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-full items-center justify-between px-3 py-2">
              <HeaderControls />
            </div>
          </header>

          <main className="flex-1 mt-16 overflow-hidden">{children}</main>
          <DevToolbar />
        </div>
      </div>
    </HeaderPopupProvider>
  );
}
