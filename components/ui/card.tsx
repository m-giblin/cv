import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return (
 <div
 className={cn("border border-sp-border bg-white p-5", className)}
 {...props}
 />
 );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
 return <h3 className={cn("font-display text-lg font-extrabold tracking-tight text-sp-text-primary", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
 return <p className={cn("text-sm leading-6 text-sp-text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return <div className={cn("space-y-4", className)} {...props} />;
}
