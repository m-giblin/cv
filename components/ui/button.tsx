import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
 variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "magenta" | "primary";
 size?: "sm" | "md" | "lg";
 asChild?: boolean;
};

const variants = {
 primary: "btn-primary",
 default: "rounded-full bg-blue text-white hover:bg-blue-2",
 secondary: "rounded-full bg-blue-soft text-blue hover:bg-[#D3DEF6]",
 outline: "rounded-full border-[1.5px] border-ink bg-white text-ink hover:bg-blue-soft",
 ghost: "rounded-full text-ink-2 hover:bg-blue-soft hover:text-ink",
 destructive: "rounded-full bg-danger text-white hover:bg-[#912018]",
 magenta: "rounded-full border-[1.5px] border-ink bg-white text-ink hover:bg-blue-soft",
};

const sizes = {
 sm: "h-9 px-3.5 text-sm",
 md: "h-10 px-4 text-sm",
 lg: "h-12 px-5 text-base",
};

export function Button({
 className,
 variant = "default",
 size = "md",
 asChild = false,
 type = "button",
 children,
 ...props
}: ButtonProps) {
 const classes =
 variant === "primary"
 ? cn("btn-primary inline-flex items-center justify-center gap-2", className)
 : cn(
 "inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  variants[variant],
 sizes[size],
 className,
 );

 if (asChild && React.isValidElement<{ className?: string }>(children)) {
 return React.cloneElement(children, {
 className: cn(classes, children.props.className),
 });
 }

 return (
 <button className={classes} type={type} {...props}>
 {children}
 </button>
 );
}
