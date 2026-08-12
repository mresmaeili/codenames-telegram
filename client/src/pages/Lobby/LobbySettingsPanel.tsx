import type { SettingsFormState } from "./Lobby";

interface WordPool {
  name: string;
  language: "fa" | "en";
  words: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LobbySettingsPanelProps {
  settingsForm: SettingsFormState;
  isOwner: boolean;
  hostActionPending: boolean;
  wordPoolLanguage: "fa" | "en";
  wordPoolWords: string;
  wordPoolSaving: boolean;
  wordPools: WordPool[];
  onWordPoolLanguageChange: (language: "fa" | "en") => void;
  onWordPoolWordsChange: (value: string) => void;
  onWordPoolSave: () => Promise<void> | void;
  onResetTeams: () => void;
  onRandomizeTeams: () => void;
  onSaveSettings: () => void;
}

export function LobbySettingsPanel({
  settingsForm,
  isOwner,
  hostActionPending,
  wordPoolLanguage,
  wordPoolWords,
  wordPoolSaving,
  wordPools,
  onWordPoolLanguageChange,
  onWordPoolWordsChange,
  onWordPoolSave,
  onResetTeams,
  onRandomizeTeams,
  onSaveSettings,
}: LobbySettingsPanelProps) {
  return (
    <div className="mt-5 rounded-[28px] bg-[#4b4d51] p-4 shadow-[0_12px_20px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">
          Game settings
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/20 bg-[#d8d0bd] px-4 py-5 text-left text-black">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#5d5d5d]">
            Language
          </div>
          <div className="mt-2 text-lg font-bold">
            {settingsForm.language === "en"
              ? "English"
              : settingsForm.language === "fa"
                ? "Farsi"
                : settingsForm.language === "es"
                  ? "Spanish"
                  : "Hebrew"}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/20 bg-[#c6c9cd] px-4 py-5 text-left text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-black">
              ⏱
            </div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">
              Timer
            </div>
          </div>
          <div className="mt-2 text-lg font-bold">
            {settingsForm.timer === "none" ? "OFF" : `${settingsForm.timer}s`}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/20 bg-[#cbd4d9] px-4 py-5 text-left text-black">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#5d5d5d]">
            Word pack
          </div>
          <div className="mt-2 text-lg font-bold">
            {settingsForm.wordPack === "classic" ? "Classic" : "Party"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onResetTeams}
          className="rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white"
        >
          Reset teams
        </button>
        <button
          type="button"
          onClick={onRandomizeTeams}
          className="rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white"
        >
          Shuffle teams
        </button>
      </div>

      <div className="mt-6 rounded-[18px] border border-white/10 bg-[#15181f] p-4">
        <p className="text-sm text-white/75">
          Room creator is admin. Save a custom word pool for this game.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm text-white/80">
            Pool language
            <select
              value={wordPoolLanguage}
              onChange={(event) =>
                onWordPoolLanguageChange(
                  event.target.value === "fa" ? "fa" : "en",
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-(--app-background) px-3 py-2 text-(--app-text)"
            >
              <option value="fa">Farsi</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="block text-sm text-white/80">
            Words
            <textarea
              value={wordPoolWords}
              onChange={(event) => onWordPoolWordsChange(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-(--app-background) px-3 py-2 text-(--app-text)"
              placeholder="Enter one word per line, comma-separated, or semicolon-separated"
            />
          </label>

          <button
            type="button"
            onClick={onWordPoolSave}
            disabled={wordPoolSaving}
            className="w-full rounded-full border border-white/20 bg-[#2cc86c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {wordPoolSaving ? "Saving..." : "Save word pool"}
          </button>
        </div>

        {wordPools.length > 0 ? (
          <div className="mt-4 space-y-3 rounded-3xl border border-white/10 bg-(--app-background) p-4 text-sm text-(--app-text)">
            <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
              Saved pools
            </p>
            {wordPools.map((pool) => (
              <div
                key={`${pool.name}-${pool.language}`}
                className="rounded-3xl border border-white/10 bg-(--app-surface) p-3"
              >
                <div className="flex items-center justify-between gap-2 text-sm text-(--app-text)">
                  <span>{pool.name}</span>
                  <span className="rounded-full bg-(--app-border)/20 px-2 py-1 text-xs text-(--app-muted)">
                    {pool.language.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-(--app-muted)">
                  {pool.words.length} words •{" "}
                  {pool.isDefault ? "Default" : "Saved"}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSaveSettings}
        disabled={!isOwner || hostActionPending}
        className="mt-6 w-full rounded-full border border-white/20 bg-[#2cc86c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {hostActionPending ? "Saving..." : "Save game settings"}
      </button>
    </div>
  );
}
