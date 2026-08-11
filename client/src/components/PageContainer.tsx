import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen w-full items-stretch justify-start overflow-x-hidden overflow-y-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
