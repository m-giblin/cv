"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/account-access-rules";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

/** Email + activation code + new password; on success signs straight in, which leads to MFA setup. */
export function ActivateAccountForm() {
  const ids = { email: useId(), code: useId(), password: useId(), confirm: useId() };
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) return void toast.error(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
    if (password !== confirm) return void toast.error("The passwords don't match.");
    setIsSubmitting(true);
    const response = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code, password }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "That didn't work. Check the code and try again.");
      setIsSubmitting(false);
      return;
    }
    toast.success("Your password is set.");
    const supabase = createClient();
    const signedIn = supabase ? await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }) : null;
    // Signed in: the app takes them to authenticator setup. If that failed, they sign in themselves.
    window.location.assign(signedIn && !signedIn.error ? AUTH_ROUTES.dashboard : AUTH_ROUTES.login);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={ids.email}>
          Work email
        </label>
        <Input autoComplete="email" id={ids.email} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={ids.code}>
          Activation code
        </label>
        <Input
          autoComplete="one-time-code"
          id={ids.code}
          inputMode="numeric"
          onChange={(event) => setCode(event.target.value)}
          placeholder="1234-5678"
          required
          value={code}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={ids.password}>
          New password
        </label>
        <Input
          autoComplete="new-password"
          id={ids.password}
          minLength={PASSWORD_MIN_LENGTH}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="mt-1 text-[13px] text-muted">At least {PASSWORD_MIN_LENGTH} characters.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={ids.confirm}>
          Confirm password
        </label>
        <Input autoComplete="new-password" id={ids.confirm} onChange={(event) => setConfirm(event.target.value)} required type="password" value={confirm} />
      </div>
      <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        Activate account
      </button>
    </form>
  );
}
