export function LoadingIndicator() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
