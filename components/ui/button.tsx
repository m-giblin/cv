import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "magenta" | "primary";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

/**
 * v3 buttons. `primary` is the amber pill (one per view). Every other variant is a quiet
 * pill: `default`, `secondary`, `outline` and `magenta` share the white secondary look,
 * `ghost` is borderless, and `destructive` is the secondary look in danger red.
 */
const variants = {
  default: "border border-line-strong bg-white text-ink hover:border-ink",
  secondary: "border border-line-strong bg-white text-ink hover:border-ink",
  outline: "border border-line-strong bg-white text-ink hover:border-ink",
  magenta: "border border-line-strong bg-white text-ink hover:border-ink",
  ghost: "text-ink-2 hover:bg-divider hover:text-ink",
  destructive: "border border-danger bg-white text-danger hover:bg-danger-soft",
};

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-[18px] text-sm",
  lg: "h-12 px-[22px] text-[15px]",
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
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:border-line disabled:bg-divider disabled:text-muted",
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
