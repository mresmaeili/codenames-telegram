import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-6 py-12">
      {children}
    </div>
  );
}
