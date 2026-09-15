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
  onResetTeams: () => void;
  onRandomizeTeams: () => void;
  onOpenTimerSettings: () => void;
  onOpenWordPackSettings: () => void;
  onThemeChange: (theme: SettingsFormState["theme"]) => void;
}

export function LobbySettingsPanel({
  settingsForm,
  isOwner,
  onResetTeams,
  onRandomizeTeams,
  onOpenTimerSettings,
  onOpenWordPackSettings,
  onThemeChange,
}: LobbySettingsPanelProps) {
  return (
    <div
      id="lobby-settings"
      className="lobby-settings mt-4 shrink-0 scroll-mt-16 rounded-2xl border-2 border-white/35 bg-gradient-to-b from-[#5a5a5a] via-[#3e3e3e] to-[#242424] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.35)]"
    >
      <h2 className="mb-3 text-center text-lg font-black uppercase tracking-wide text-white/90">
        Game Settings
      </h2>
      <div className="lobby-option-grid grid gap-2 sm:grid-cols-3">
        <label className="lobby-option lobby-theme-option order-3 rounded-xl border-2 border-white/25 bg-gradient-to-b from-[#555555] to-[#303030] px-3 py-3 text-left text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08),0_3px_0_rgba(0,0,0,0.22)] sm:col-start-3 sm:row-start-1">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
            Theme
          </span>
          <select
            value={settingsForm.theme}
            onChange={(event) =>
              onThemeChange(event.target.value as SettingsFormState["theme"])
            }
            disabled={!isOwner}
            className="lobby-theme-select mt-2 w-full rounded-lg border border-white/30 bg-[#101820] px-3 py-2 text-base font-black text-white outline-none transition focus:border-[#7ee6ff] focus:ring-2 focus:ring-[#7ee6ff]/30"
          >
            <option value="classic">Classic</option>
            <option value="persian">Persian</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onOpenWordPackSettings}
          disabled={!isOwner}
          className={`lobby-option lobby-word-pack-language rounded-xl border-2 px-3 py-3 text-left text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_2px_0_rgba(0,0,0,0.22)] active:bg-white/15 ${
            isOwner
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <div className="lobby-setting-icon lobby-word-pack-icon">
            <span>
              {settingsForm.language === "en"
                ? "ENGLISH"
                : settingsForm.language === "fa"
                  ? "FARSI"
                  : settingsForm.language === "es"
                    ? "SPANISH"
                    : "HEBREW"}
            </span>
          </div>
          <div className="lobby-setting-copy">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              Word packs & language
            </div>
            <div className="mt-1 text-base font-black">
              {settingsForm.language === "en"
                ? "English"
                : settingsForm.language === "fa"
                  ? "Farsi"
                  : settingsForm.language === "es"
                    ? "Spanish"
                    : "Hebrew"}{" "}
              /{" "}
              {settingsForm.wordPack === "classic"
                ? "Classic"
                : settingsForm.wordPack === "party"
                  ? "Party"
                  : "Custom"}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenTimerSettings}
          disabled={!isOwner}
          className={`lobby-option lobby-timer rounded-xl border-2 border-white/25 bg-gradient-to-b from-[#555555] to-[#303030] px-3 py-3 text-left text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08),0_3px_0_rgba(0,0,0,0.22)] active:bg-white/20 ${
            isOwner
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <div className="lobby-setting-icon lobby-timer-icon">⏱</div>
          <div className="lobby-setting-copy">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
              Timer
            </div>
            <div className="mt-1 text-base font-black">
              {settingsForm.timer === "none"
                ? "OFF"
                : `${settingsForm.spymasterTimer}s / ${settingsForm.operativeTimer}s`}
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onResetTeams}
          disabled={!isOwner}
          className="lobby-secondary-action rounded-full border-2 border-white/70 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset teams
        </button>
        <button
          type="button"
          onClick={onRandomizeTeams}
          disabled={!isOwner}
          className="lobby-secondary-action rounded-full border-2 border-white/70 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Randomize teams
        </button>
      </div>
    </div>
  );
}
