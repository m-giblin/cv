"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Six-box one-time-code field. A single real input (visually hidden) carries the value, the label and
 * autofill; the boxes mirror it. The input sits over the boxes, so clicking them focuses it.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  label = "One-time code",
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  label?: string;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const digits = value.padEnd(length, " ").split("").slice(0, length);
  const focusIndex = value.length < length ? value.length : length - 1;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <div aria-hidden className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <div
              className={cn(
                "num flex h-[52px] w-full max-w-[52px] items-center justify-center rounded-[10px] border bg-white text-[22px] font-bold text-ink",
                digit.trim() ? "border-ink-2" : "border-line-strong",
                focused && index === focusIndex && "border-blue outline-2 outline-offset-2 outline-blue",
              )}
              key={index}
            >
              {digit.trim()}
            </div>
          ))}
        </div>
        <input
          autoComplete="one-time-code"
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          id={id}
          inputMode="numeric"
          maxLength={length}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
          onFocus={() => setFocused(true)}
          pattern="[0-9]*"
          type="text"
          value={value}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted">The code refreshes every 30 seconds.</p>
    </div>
  );
}
