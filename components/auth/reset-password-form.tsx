"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    toast.success("Password updated. Sign in with your new password.");
    await supabase.auth.signOut();
    router.push(AUTH_ROUTES.login);
    router.refresh();
  }

  if (!isReady) {
    return (
      <div className="space-y-4 text-sm leading-6 text-sp-navy-muted">
        <p>Open the reset link from your email to set a new password.</p>
        <Button asChild className="w-full" variant="outline">
          <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        New password
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-blue/60" />
          <Input
            autoComplete="new-password"
            className="pl-10"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Confirm password
        <Input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save new password
      </Button>
    </form>
  );
}
