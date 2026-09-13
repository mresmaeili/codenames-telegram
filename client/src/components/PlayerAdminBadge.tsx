interface PlayerAdminBadgeProps {
  isAdmin: boolean;
  className?: string;
}

export function PlayerAdminBadge({
  isAdmin,
  className = "",
}: PlayerAdminBadgeProps) {
  if (!isAdmin) {
    return null;
  }

  return (
    <span
      aria-label="Room admin"
      title="Room admin"
      className={`lobby-admin-mark absolute -left-1 -top-1 z-10 text-[10px] leading-none ${className}`}
    >
      👑
    </span>
  );
}
