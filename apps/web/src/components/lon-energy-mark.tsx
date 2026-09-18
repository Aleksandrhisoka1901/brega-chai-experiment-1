export function LonEnergyMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="currentColor" height="32" rx="8" width="32" />
      <path
        d="M10.8 10.7c2.6-4.2 7.8-4.2 10.4 0"
        stroke="#ff9c0d"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="16" cy="12.7" fill="#ff9c0d" r="2.55" />
      <path d="M17.7 14.6 10.8 22.3h5.2L12.2 28.3 22.8 18.9h-5.5Z" fill="#ff9c0d" />
    </svg>
  );
}
