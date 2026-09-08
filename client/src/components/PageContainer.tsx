import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex w-full items-stretch justify-start overflow-x-hidden overflow-y-auto pb-0">
      {children}
    </div>
  );
}
