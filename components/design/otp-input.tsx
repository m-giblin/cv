"use client";

import { useRef } from "react";

export function OtpInput({
 value,
 onChange,
 length = 6,
}: {
 value: string;
 onChange: (next: string) => void;
 length?: number;
}) {
 const inputRef = useRef<HTMLInputElement>(null);
 const digits = value.padEnd(length, " ").split("").slice(0, length);
 const focusIndex = value.length < length ? value.length : null;

 return (
 <div>
 <div
 className="flex justify-center gap-[7px]"
 onClick={() => inputRef.current?.focus()}
 onKeyDown={() => inputRef.current?.focus()}
 role="presentation"
 >
 {digits.map((digit, index) => (
 <div
 className="flex h-[52px] w-[44px] items-center justify-center border-[1.5px] font-mono text-[22px] font-medium transition-colors"
 key={index}
 style={{
 borderColor: digit.trim() ? "#0071CE" : focusIndex === index ? "#0071CE" : "#D4D1CB",
 background: digit.trim() ? "#F8FBFF" : "#ffffff",
 }}
 >
 {digit.trim() || ""}
 </div>
 ))}
 </div>
 <input
 autoComplete="one-time-code"
 className="sr-only"
 inputMode="numeric"
 maxLength={length}
 onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
 ref={inputRef}
 type="text"
 value={value}
 />
 </div>
 );
}
