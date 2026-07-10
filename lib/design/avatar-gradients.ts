export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0033a1,#0071ce)",
  "linear-gradient(135deg,#0071ce,#0891b2)",
  "linear-gradient(135deg,#5b21b6,#7c3aed)",
  "linear-gradient(135deg,#0369a1,#0891b2)",
  "linear-gradient(135deg,#9d174d,#be185d)",
  "linear-gradient(135deg,#065f46,#059669)",
] as const;

export function avatarGradientForIndex(index: number): string {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}
