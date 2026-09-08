import type { PropsWithChildren } from "react";

import { DevToolbar } from "@/components/DevToolbar";
import { SettingsPopup } from "@/components/SettingsPopup";
import {
  HeaderPopupProvider,
  useHeaderPopup,
} from "@/context/HeaderPopupContext";

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
          {/* Render popup outside the header so fixed centering works correctly */}
          <PopupRenderer />

          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-0 pb-0">
            {children}
          </main>
          <DevToolbar />
        </div>
      </div>
    </HeaderPopupProvider>
  );
}
