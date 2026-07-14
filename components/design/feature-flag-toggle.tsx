"use client";

export function FeatureFlagToggle({
 enabled,
 onChange,
 disabled,
}: {
 enabled: boolean;
 onChange?: (next: boolean) => void;
 disabled?: boolean;
}) {
 return (
 <button
 aria-checked={enabled}
 className="relative shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
 disabled={disabled}
 onClick={() => onChange?.(!enabled)}
 role="switch"
 style={{
 width: 32,
 height: 18,
 background: enabled ? "#0071CE" : "#E2DFD9",
 transition: "background 150ms",
 }}
 type="button"
 >
 <span
 className="absolute top-[2px] block h-[14px] w-[14px] bg-white"
 style={{
 transform: enabled ? "translateX(14px)" : "translateX(2px)",
 transition: "transform 150ms",
 }}
 />
 </button>
 );
}
