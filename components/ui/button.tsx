import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "magenta";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const variants = {
  default:
    "bg-sp-blue text-white shadow-sm shadow-sp-blue/20 hover:bg-sp-blue-deep focus-visible:ring-sp-blue",
  secondary: "bg-sp-blue-soft text-sp-blue-deep hover:bg-[#d4e8f9]",
  outline:
    "border border-sp-blue/20 bg-white text-sp-navy hover:border-sp-blue/40 hover:bg-sp-blue-soft/50",
  ghost: "text-sp-navy-muted hover:bg-sp-blue-soft/60 hover:text-sp-navy",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  magenta:
    "border border-sp-magenta/25 bg-sp-magenta-soft text-sp-magenta hover:border-sp-magenta/40 hover:bg-[#fce8f8]",
};

const sizes = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-2xl px-5 text-base",
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
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
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
