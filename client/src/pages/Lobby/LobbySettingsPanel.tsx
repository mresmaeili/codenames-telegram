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
  onResetTeams: () => void;
  onRandomizeTeams: () => void;
  onSaveSettings: () => void;
  onOpenLanguageSettings: () => void;
  onOpenTimerSettings: () => void;
  onOpenWordPackSettings: () => void;
  onModeChange: (mode: SettingsFormState["gameMode"]) => void;
}

export function LobbySettingsPanel({
  settingsForm,
  isOwner,
  hostActionPending,
  onResetTeams,
  onRandomizeTeams,
  onSaveSettings,
  onOpenLanguageSettings,
  onOpenTimerSettings,
  onOpenWordPackSettings,
  onModeChange,
}: LobbySettingsPanelProps) {
  return (
    <div
      id="lobby-settings"
      className="mt-4 scroll-mt-16 rounded-2xl border-2 border-white/35 bg-gradient-to-b from-[#575757] to-[#252525] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.1),0_8px_18px_rgba(0,0,0,0.3)]"
    >
      <h2 className="mb-3 text-center text-lg font-black uppercase tracking-wide text-white/90">
        Game Settings
      </h2>
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl border-2 border-white/15 bg-black/25 p-1">
        {[
          {
            value: "standard" as const,
            label: "Classic",
            detail: "4+ players",
          },
          { value: "rush" as const, label: "Duet", detail: "2+ players" },
        ].map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onModeChange(mode.value)}
            disabled={!isOwner}
            className={`rounded-lg px-3 py-2 text-left transition ${
              settingsForm.gameMode === mode.value
                ? "bg-[#159dce] text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]"
                : "text-white/60 hover:bg-white/10"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="block text-sm font-black uppercase">
              {mode.label}
            </span>
            <span className="block text-[10px] uppercase tracking-wide text-white/70">
              {mode.detail}
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenLanguageSettings}
          disabled={!isOwner}
          className={`rounded-xl border-2 border-[#cfc4b2] bg-[#cfc4b2] px-3 py-3 text-left text-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.28)] active:bg-white/80 ${
            isOwner
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d5d5d]">
            Language
          </div>
          <div className="mt-1 text-base font-black">
            {settingsForm.language === "en"
              ? "English"
              : settingsForm.language === "fa"
                ? "Farsi"
                : settingsForm.language === "es"
                  ? "Spanish"
                  : "Hebrew"}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenTimerSettings}
          disabled={!isOwner}
          className={`rounded-xl border-2 border-white/25 bg-[#4a4a4a] px-3 py-3 text-left text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)] active:bg-white/20 ${
            isOwner
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lg text-black">
              ⏱
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
              Timer
            </div>
          </div>
          <div className="mt-1 text-base font-black">
            {settingsForm.timer === "none" ? "OFF" : `${settingsForm.timer}s`}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenWordPackSettings}
          disabled={!isOwner}
          className={`rounded-xl border-2 border-white/25 bg-[#4a4a4a] px-3 py-3 text-left text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)] active:bg-white/20 ${
            isOwner
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
            Word pack
          </div>
          <div className="mt-1 text-base font-black">
            {settingsForm.wordPack === "classic" ? "Classic" : "Party"}
          </div>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onResetTeams}
          disabled={!isOwner}
          className="rounded-full border-2 border-white/60 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset teams
        </button>
        <button
          type="button"
          onClick={onRandomizeTeams}
          disabled={!isOwner}
          className="rounded-full border-2 border-white/60 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Randomize teams
        </button>
      </div>
      <button
        type="button"
        onClick={onSaveSettings}
        disabled={!isOwner || hostActionPending}
        className="mt-2 w-full rounded-full bg-[#51df20] px-4 py-2 text-sm font-black uppercase text-white shadow-[0_3px_7px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hostActionPending ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}
