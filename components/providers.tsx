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
 <Toaster
 position="bottom-center"
 toastOptions={{
 duration: 2600,
 unstyled: true,
 classNames: {
 toast:
 "toast-in flex items-center gap-2 rounded-full bg-ink px-[22px] py-3 text-[15px] font-semibold text-white",
 success: "[&_[data-icon]]:text-signal",
 error: "[&_[data-icon]]:text-[#FFB4AB]",
 description: "text-sm font-normal text-on-blue",
 actionButton: "ml-2 rounded-full bg-signal px-3 py-1 text-sm font-bold text-ink",
 },
 }}
 />
 </QueryClientProvider>
 );
}
