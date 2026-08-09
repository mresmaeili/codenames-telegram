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
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-muted)]">
          Game over
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--app-text)]">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-6 text-[color:var(--app-text)]">
          {description}
        </p>
        {summary ? (
          <p className="mt-4 text-sm text-[color:var(--app-muted)]">{summary}</p>
        ) : null}
        {onRematch ? (
          <button
            type="button"
            onClick={onRematch}
            className="mt-6 w-full rounded-full border border-[color:var(--app-border)] bg-[var(--app-accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--app-accent-hover)]"
          >
            Play again
          </button>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--app-muted)]">
            Only room owners can request a rematch. Ask a host to restart.
          </p>
        )}
        <button
          type="button"
          onClick={onReturnToLobby}
          className="mt-3 w-full rounded-full border border-[color:var(--app-border)] bg-[var(--app-background)] px-4 py-3 text-sm font-medium text-[color:var(--app-text)] transition hover:bg-[var(--app-surface)]"
        >
          Return to lobby
        </button>
      </div>
    </div>
  );
}
