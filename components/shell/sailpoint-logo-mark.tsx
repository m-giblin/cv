function SailMarkSvg({
  className,
  fillPrimary = "white",
  fillSecondary = "rgba(255,255,255,0.45)",
  strokeColor = "white",
}: {
  className?: string;
  fillPrimary?: string;
  fillSecondary?: string;
  strokeColor?: string;
}) {
  return (
    <svg aria-hidden className={className} fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path d="M10.5 2C10.5 2 16.5 6 16.5 13H10.5V2Z" fill={fillPrimary} />
      <path d="M10.5 5C10.5 5 4.5 8 4.5 13H10.5V5Z" fill={fillSecondary} />
      <path d="M3 14.5H17" stroke={strokeColor} strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

export function SailPointLogoMark({
  className,
  variant = "boxed",
}: {
  className?: string;
  variant?: "boxed" | "flat" | "flat-white";
}) {
  if (variant === "flat") {
    return (
      <SailMarkSvg
        className={className ?? "h-[22px] w-[22px] shrink-0"}
        fillPrimary="#0033a1"
        fillSecondary="rgba(0,51,161,0.35)"
        strokeColor="#0033a1"
      />
    );
  }

  if (variant === "flat-white") {
    return (
      <SailMarkSvg
        className={className ?? "h-[22px] w-[22px] shrink-0"}
        fillPrimary="white"
        fillSecondary="rgba(255,255,255,0.4)"
        strokeColor="white"
      />
    );
  }

  return (
    <span
      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#0033a1] to-[#0071ce] shadow-[0_4px_14px_rgba(0,113,206,0.38)] ${className ?? ""}`}
    >
      <SailMarkSvg />
    </span>
  );
}
