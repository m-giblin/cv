export function Toggle({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`relative inline-block h-[20px] w-[36px] cursor-pointer ${className ?? ""}`}>
      <input
        checked={checked}
        className="sr-only"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <span
        className="absolute inset-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? "#0071ce" : "#e2eaf5" }}
      >
        <span
          className="absolute left-[3px] top-[3px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? "translateX(16px)" : "none" }}
        />
      </span>
    </label>
  );
}

export { Toggle as AdminToggle };
