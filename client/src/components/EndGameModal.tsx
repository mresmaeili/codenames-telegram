interface EndGameModalProps {
  title: string;
  description: string;
  summary?: string;
  onReturnToLobby: () => void;
  onRematch?: () => void;
}

export function EndGameModal({
  title,
  description,
  summary,
  onReturnToLobby,
  onRematch,
}: EndGameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-(--app-border) bg-(--app-surface) p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--app-muted)">
          Game over
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-(--app-text)">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-6 text-(--app-text)">
          {description}
        </p>
        {summary ? (
          <p className="mt-4 text-sm text-(--app-muted)">{summary}</p>
        ) : null}
        {onRematch ? (
          <button
            type="button"
            onClick={onRematch}
            className="mt-6 w-full rounded-full border border-(--app-border) bg-(--app-accent) px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
          >
            Play again
          </button>
        ) : (
          <p className="mt-4 text-sm text-(--app-muted)">
            Only room owners can request a rematch. Ask a host to restart.
          </p>
        )}
        <button
          type="button"
          onClick={onReturnToLobby}
          className="mt-3 w-full rounded-full border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm font-medium text-(--app-text) transition hover:bg-(--app-surface)"
        >
          Return home
        </button>
      </div>
    </div>
  );
}
