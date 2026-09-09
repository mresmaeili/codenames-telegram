import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface TurnBannerProps {
  instruction: string;
  player?: Room["players"][number];
  isYourTurn?: boolean;
  onHelp: () => void;
}

export function TurnBanner({
  instruction,
  player,
  isYourTurn = false,
  onHelp,
}: TurnBannerProps) {
  return (
    <div
      className={`mt-2 flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-center text-[clamp(1rem,4vw,1.45rem)] font-black uppercase leading-[0.92] tracking-tight text-white ${isYourTurn ? "border-2 border-[#b8ff8e] bg-[#51df20]/20 shadow-[0_0_18px_rgba(81,223,32,0.22)]" : ""}`}
    >
      {isYourTurn ? (
        <span className="rounded-full bg-[#51df20] px-2 py-1 text-[0.58rem] font-black tracking-[0.12em] text-[#123d08]">
          Your turn
        </span>
      ) : null}
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
