"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password field with a show/hide button. Pair with a <label htmlFor>. */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} className={cn("pr-12", className)} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-muted hover:text-ink"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
      </button>
    </div>
  );
}

/** Live "do they match?" line for the confirm field. Silent until something is typed there. */
export function PasswordMatchHint({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const matches = password === confirm;
  return (
    <p aria-live="polite" className={cn("mt-1 text-[13px] font-semibold", matches ? "text-success" : "text-danger")}>
      {matches ? "Passwords match." : "Passwords don't match yet."}
    </p>
  );
}
