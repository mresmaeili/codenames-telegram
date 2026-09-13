import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";
import { PlayerPresenceDot } from "@/components/PlayerPresenceDot";

interface TurnBannerProps {
  instruction: string;
  player?: Room["players"][number];
  ownerIds?: number[];
  isYourTurn?: boolean;
  onHelp: () => void;
}

export function TurnBanner({
  instruction,
  player,
  ownerIds = [],
  isYourTurn = false,
  onHelp,
}: TurnBannerProps) {
  return (
    <div
      className={`mt-0 flex min-h-8 items-center justify-center gap-1 rounded-xl px-1 text-center text-[clamp(0.86rem,3.6vw,1.45rem)] font-black uppercase leading-[0.92] tracking-tight text-white sm:mt-2 sm:min-h-10 sm:gap-1.5 sm:px-2 ${isYourTurn ? "border-2 border-[#b8ff8e] bg-[#51df20]/20 shadow-[0_0_18px_rgba(81,223,32,0.22)]" : ""}`}
    >
      {isYourTurn ? (
        <span className="rounded-full bg-[#51df20] px-1.5 py-0.5 text-[0.5rem] font-black tracking-[0.1em] text-[#123d08] sm:px-2 sm:py-1 sm:text-[0.58rem]">
          Your turn
        </span>
      ) : null}
      <span>{instruction}</span>
      {player ? (
        <span className="relative shrink-0">
          <img
            src={avatarUrlForPlayer(player)}
            alt={player.displayName}
            title={player.displayName}
            className="h-6 w-6 rounded-full border-2 border-white object-cover sm:h-8 sm:w-8"
          />
          <PlayerPresenceDot player={player} className="border-white" />
          <PlayerAdminBadge isAdmin={ownerIds.includes(player.telegramId)} />
        </span>
      ) : null}
      <button
        type="button"
        onClick={onHelp}
        aria-label="How to play"
        title="How to play"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-[#54df20] text-sm text-white shadow-[0_2px_5px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 active:scale-95 sm:h-7 sm:w-7 sm:text-base"
      >
        <span aria-hidden="true">?</span>
      </button>
    </div>
  );
}
