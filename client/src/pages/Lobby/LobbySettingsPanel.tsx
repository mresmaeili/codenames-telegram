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
}: LobbySettingsPanelProps) {
  return (
    <div className="mt-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenLanguageSettings}
          className="rounded-[18px] border border-white/20 bg-[#d8d0bd] px-4 py-5 text-left text-black transform transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2cc86c]/30 cursor-pointer"
        >
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
        </button>

        <button
          type="button"
          onClick={onOpenTimerSettings}
          className="rounded-[18px] border border-white/20 bg-[#c6c9cd] px-4 py-5 text-left text-white transform transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2cc86c]/30 cursor-pointer"
        >
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
        </button>

        <button
          type="button"
          onClick={onOpenWordPackSettings}
          className="rounded-[18px] border border-white/20 bg-[#cbd4d9] px-4 py-5 text-left text-black transform transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2cc86c]/30 cursor-pointer"
        >
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#5d5d5d]">
            Word pack
          </div>
          <div className="mt-2 text-lg font-bold">
            {settingsForm.wordPack === "classic" ? "Classic" : "Party"}
          </div>
        </button>
      </div>

      {/* Reset and Shuffle controls moved to the assignments area */}
    </div>
  );
}
