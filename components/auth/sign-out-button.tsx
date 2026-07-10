"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
 compact = false,
 darkSidebar = false,
}: {
 compact?: boolean;
 darkSidebar?: boolean;
}) {
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

 if (darkSidebar) {
 return (
 <button
 className="flex flex-1 items-center justify-center gap-1.5 bg-white/5 px-1.5 py-1.5 text-[11px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/75 disabled:opacity-50"
 disabled={isSigningOut}
 onClick={() => void handleSignOut()}
 type="button"
 >
 <LogOut className="h-3.5 w-3.5" />
 Sign out
 </button>
 );
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
