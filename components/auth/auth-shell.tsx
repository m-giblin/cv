import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function AuthShell({
 title,
 description,
 eyebrow,
 children,
}: {
 title: string;
 description: string;
 eyebrow: string;
 children: ReactNode;
}) {
 return (
 <div className="flex min-h-screen items-center justify-center px-4 py-10">
 <div className="w-full max-w-md">
 <div className="mb-8 text-center">
 <span className="sp-logo-mark mx-auto flex h-14 w-14 items-center justify-center text-xl font-bold text-white">
 SE
 </span>
 <Badge className="mt-5" tone="blue">
 {eyebrow}
 </Badge>
 <h1 className="mt-4 text-2xl font-bold tracking-tight text-sp-navy">{title}</h1>
 <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{description}</p>
 </div>

 <div className="sp-card-glow border border-white/80 bg-white/95 p-6 backdrop-blur-sm md:p-8">
 {children}
 </div>

 <p className="mt-6 text-center text-xs text-sp-navy-muted">
 SailPoint internal • MFA required on every sign-in
 </p>
 </div>
 </div>
 );
}
