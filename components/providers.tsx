"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { SessionTimeout } from "@/components/auth/session-timeout";

export function Providers({ children }: { children: ReactNode }) {
 const [queryClient] = useState(
 () =>
 new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 30_000,
 },
 },
 }),
 );

 return (
 <QueryClientProvider client={queryClient}>
 <SessionTimeout />
 {children}
 <Toaster richColors position="top-right" />
 </QueryClientProvider>
 );
}
