import { avatarGradientForIndex } from "@/lib/design/avatar-gradients";
import { cn } from "@/lib/utils";

export function AvatarInitials({
  initials,
  index = 0,
  size = 26,
  className,
}: {
  initials: string;
  index?: number;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-mono font-medium text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: avatarGradientForIndex(index),
      }}
    >
      {initials}
    </div>
  );
}
