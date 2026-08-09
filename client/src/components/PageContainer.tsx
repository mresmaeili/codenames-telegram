import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-stretch justify-start overflow-hidden">
      {children}
    </div>
  );
}
