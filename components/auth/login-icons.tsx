export function LoginSailMark({ size = 24 }: { size?: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 20 20" width={size}>
      <path d="M10.5 2C10.5 2 16.5 6 16.5 13H10.5V2Z" fill="white" />
      <path d="M10.5 5C10.5 5 4.5 8 4.5 13H10.5V5Z" fill="rgba(255,255,255,0.45)" />
      <path d="M3 14.5H17" stroke="white" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height="16"
      stroke="#94a3b8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="9" rx="1.5" width="13" x="1.5" y="3.5" />
      <path d="M1.5 6l6.5 4 6.5-4" />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height="16"
      stroke="#94a3b8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="8" rx="1.5" width="10" x="3" y="7" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg
      aria-hidden
      fill="none"
      height="15"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 16 16"
      width="15"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg aria-hidden fill="#0071ce" height="18" viewBox="0 0 24 24" width="18">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}
