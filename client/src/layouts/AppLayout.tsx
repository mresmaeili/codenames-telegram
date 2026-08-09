import type { PropsWithChildren } from "react";

import { env } from "@/config/env";
import { DevToolbar } from "@/components/DevToolbar";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[color:var(--app-text)]">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[color:var(--app-border)] px-6 py-4">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <span className="text-sm font-medium tracking-[0.24em] text-[color:var(--app-muted)] uppercase">
              Codenames
            </span>
            <span className="text-xs text-[color:var(--app-muted)]">
              {env.APP_NAME}
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>
        <DevToolbar />
      </div>
    </div>
  );
}
