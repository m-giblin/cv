export function Toggle({
 checked,
 onChange,
 className,
 disabled,
}: {
 checked: boolean;
 onChange: (v: boolean) => void;
 className?: string;
 disabled?: boolean;
}) {
 return (
 <button
 aria-checked={checked}
 className={`relative shrink-0 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className ?? ""}`}
 disabled={disabled}
 onClick={() => onChange(!checked)}
 role="switch"
 style={{
 width: 32,
 height: 18,
 background: checked ? "#0071CE" : "#E2DFD9",
 transition: "background 150ms",
 }}
 type="button"
 >
 <span
 className="absolute top-[2px] block h-[14px] w-[14px] bg-white"
 style={{
 transform: checked ? "translateX(14px)" : "translateX(2px)",
 transition: "transform 150ms",
 }}
 />
 </button>
 );
}

export { Toggle as AdminToggle };
