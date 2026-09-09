import { PageContainer } from "@/components/PageContainer";

interface LoadingSkeletonProps {
  variant: "home" | "lobby" | "game";
}

const shimmer = "animate-pulse rounded-2xl bg-white/12";

export function LoadingSkeleton({ variant }: LoadingSkeletonProps) {
  if (variant === "game") {
    return (
      <PageContainer>
        <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-7xl flex-col overflow-hidden px-1 sm:px-2">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/15">
            <div className={`${shimmer} h-9 w-9 rounded-full`} />
            <div className="flex gap-2">
              <div className={`${shimmer} h-9 w-16 rounded-full`} />
              <div className={`${shimmer} h-9 w-9 rounded-full`} />
            </div>
            <div className={`${shimmer} h-9 w-9 rounded-full`} />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(4.5rem,0.72fr)_minmax(0,2.4fr)_minmax(4.5rem,0.72fr)] gap-1 sm:grid-cols-[minmax(7rem,0.8fr)_minmax(0,2.4fr)_minmax(7rem,0.8fr)]">
            <div className="flex flex-col gap-1 py-2">
              <div className={`${shimmer} h-20`} />
              <div className={`${shimmer} h-10`} />
              <div className={`${shimmer} h-20`} />
            </div>
            <div className="flex min-w-0 flex-col items-center gap-2 py-2">
              <div className={`${shimmer} h-8 w-4/5`} />
              <div className="grid aspect-square w-full grid-cols-5 gap-1">
                {Array.from({ length: 25 }, (_, index) => (
                  <div key={index} className="rounded-md bg-white/15" />
                ))}
              </div>
              <div className={`${shimmer} h-12 w-full`} />
            </div>
            <div className="flex flex-col gap-1 py-2">
              <div className={`${shimmer} h-20`} />
              <div className={`${shimmer} h-10`} />
              <div className={`${shimmer} h-20`} />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (variant === "lobby") {
    return (
      <div className="min-h-[100dvh] w-full px-2 py-3 text-white">
        <div className="h-20 rounded-2xl bg-white/10 p-3">
          <div className={`${shimmer} mx-auto h-3 w-20`} />
          <div className={`${shimmer} mx-auto mt-2 h-7 w-28`} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-white/10"
            >
              <div className={`${shimmer} h-10 w-10 rounded-full`} />
              <div className={`${shimmer} h-2 w-14`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-5">
      <div className="space-y-3 rounded-3xl border border-white/15 bg-white/8 p-4">
        <div className={`${shimmer} h-5 w-36`} />
        <div className={`${shimmer} h-4 w-64 max-w-full`} />
        <div className={`${shimmer} h-11 w-full`} />
        <div className={`${shimmer} h-11 w-full`} />
      </div>
    </div>
  );
}
