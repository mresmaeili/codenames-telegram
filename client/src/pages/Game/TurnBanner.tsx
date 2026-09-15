import touchCardIcon from "@/assets/icon-touch-card.svg";
import { avatarUrlForPlayer } from "@/lib/avatar";
import type { Room } from "@/../shared/src/types/room";
import type { Turn } from "@/../shared/src/types/game";

interface TurnBannerProps {
  instruction: string;
  showConfirmHint?: boolean;
  waitingForPlayer?: Room["players"][number];
  waitingTeam?: Turn;
}

export function TurnBanner({
  instruction,
  showConfirmHint = false,
  waitingForPlayer,
  waitingTeam,
}: TurnBannerProps) {
  return (
    <div className="mt-0 flex min-h-8 min-w-0 items-center justify-center gap-1 overflow-hidden px-1 text-center text-[clamp(0.68rem,2.7vw,1.1rem)] font-black uppercase leading-[0.92] tracking-tight text-white sm:mt-2 sm:min-h-10 sm:gap-1.5 sm:px-2">
      {waitingTeam ? (
        waitingForPlayer ? (
          <span className="flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
            <span>WAIT FOR</span>
            <span className="relative flex shrink-0 -translate-y-0.5 flex-col items-center">
              <img
                src={avatarUrlForPlayer(waitingForPlayer)}
                alt={waitingForPlayer.displayName}
                title={waitingForPlayer.displayName}
                className="h-6 w-6 rounded-full border border-white/90 object-cover sm:h-7 sm:w-7"
              />
              <span className="-mt-1 max-w-10 truncate rounded-sm bg-[#9f3028] px-0.5 text-[0.42rem] font-semibold leading-none text-white sm:text-[0.46rem]">
                {waitingForPlayer.displayName}
              </span>
            </span>
            <span>TO GIVE YOU A CLUE</span>
          </span>
        ) : (
          <span className="min-w-0 max-w-full truncate whitespace-nowrap">
            {waitingTeam.toUpperCase()} TEAM NEEDS A SPYMASTER
          </span>
        )
      ) : showConfirmHint ? (
        <span className="flex items-center justify-center gap-1 sm:gap-1.5">
          <span>TAP</span>
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#b8ff8e] bg-[#51df20] shadow-[0_2px_5px_rgba(0,0,0,0.35)] sm:h-8 sm:w-8"
          >
            <img src={touchCardIcon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <span>TO CONFIRM YOUR CHOICE</span>
        </span>
      ) : (
        <span className="min-w-0 max-w-full truncate whitespace-nowrap">
          {instruction}
        </span>
      )}
    </div>
  );
}
