/**
 * v2 avatars: a solid blue-soft circle with blue initials. No gradients and no per-person colours.
 * The `*ForId` helpers are kept so data mappers can still hand a background value to the view.
 */
export const AVATAR_BG = "#E5ECFA"; // --color-blue-soft
export const AVATAR_FG = "#0033A1"; // --color-blue

/** Tailwind classes for an avatar circle on the v2 tokens. */
export const AVATAR_CLASSNAME = "bg-blue-soft text-blue";

export function avatarGradientForIndex(index: number) {
  void index;
  return AVATAR_BG;
}

export function avatarGradientForId(id: string) {
  void id;
  return AVATAR_BG;
}
