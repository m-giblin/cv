"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push(AUTH_ROUTES.login);
    router.refresh();
  }

  if (compact) {
    return (
      <Button
        className="shrink-0"
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
        size="sm"
        variant="outline"
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Sign out</span>
      </Button>
    );
  }

  return (
    <Button
      className="mt-4 w-full"
      disabled={isSigningOut}
      onClick={() => void handleSignOut()}
      size="sm"
      variant="outline"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
