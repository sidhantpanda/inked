import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const GridIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </IconBase>
);
export const ClockIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </IconBase>
);
export const CloudIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 18h11a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.4 8.7 4.7 4.7 0 0 0 6 18Z" />
    <path d="M8 21v-1M12 21v-1M16 21v-1" />
  </IconBase>
);
export const CalendarIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </IconBase>
);
export const ScoreIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M8 4h8M9 4l1 4-4 3 2 7M15 4l-1 4 4 3-2 7M8 20h8" />
  </IconBase>
);
export const MessageIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 5h16v12H8l-4 4V5Z" />
    <path d="M8 9h8M8 13h5" />
  </IconBase>
);
export const DownloadIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </IconBase>
);
export const PaintIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m14 4 6 6-9 9H5v-6l9-9Z" />
    <path d="m12 6 6 6M5 19l-2 2" />
  </IconBase>
);
export const CheckIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m5 12 4 4L19 6" />
  </IconBase>
);
export const ChevronIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m9 6 6 6-6 6" />
  </IconBase>
);
