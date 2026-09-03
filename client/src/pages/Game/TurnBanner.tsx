import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface TurnBannerProps {
  instruction: string;
  player?: Room["players"][number];
  onHelp: () => void;
}

export function TurnBanner({ instruction, player, onHelp }: TurnBannerProps) {
  return (
    <div className="mt-3 flex min-h-10 items-center justify-center gap-2 text-center text-[clamp(1rem,4vw,1.45rem)] font-black uppercase leading-none tracking-tight text-white">
      <span>{instruction}</span>
      {player ? (
        <img
          src={avatarUrlForPlayer(player)}
          alt={player.displayName}
          title={player.displayName}
          className="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover"
        />
      ) : null}
      <button
        type="button"
        onClick={onHelp}
        aria-label="How to play"
        title="How to play"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-[#54df20] text-base text-white shadow-[0_2px_5px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 active:scale-95"
      >
        <span aria-hidden="true">?</span>
      </button>
    </div>
  );
}
