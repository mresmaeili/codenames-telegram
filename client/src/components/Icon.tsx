import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "check"
  | "close"
  | "copy"
  | "menu"
  | "refresh"
  | "settings"
  | "volume"
  | "volumeOff";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactNode> = {
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  copy: (
    <>
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  refresh: (
    <>
      <path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11" />
      <path d="M3 5v6h6M4 13a8.1 8.1 0 0 0 14.9 3L21 13" />
      <path d="M21 19v-6h-6" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.3a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 4.5 12a2 2 0 0 0-1.5-1.8 2 2 0 1 1 1.5-3.7 2 2 0 0 0 2.4-2.4 2 2 0 1 1 3.7-1.5A2 2 0 0 0 12 4.5a2 2 0 0 0 1.8-1.9 2 2 0 1 1 3.7 1.5 2 2 0 0 0 2.4 2.4 2 2 0 1 1 1.5 3.7A2 2 0 0 0 19.5 12a2 2 0 0 0-.1 3Z" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m17 9 4 4m0-4-4 4" />
    </>
  ),
};

export function Icon({ name, size = 18, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
