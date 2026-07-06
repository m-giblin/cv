/** Manager + SE avatar circles — MANAGER_TSX_COMPONENTS.md */
export const SE_AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0033a1,#0071ce)",
  "linear-gradient(135deg,#0071ce,#0891b2)",
  "linear-gradient(135deg,#5b21b6,#7c3aed)",
  "linear-gradient(135deg,#0369a1,#0891b2)",
  "linear-gradient(135deg,#9d174d,#be185d)",
  "linear-gradient(135deg,#065f46,#059669)",
] as const;

export function avatarGradientForIndex(index: number) {
  return SE_AVATAR_GRADIENTS[index % SE_AVATAR_GRADIENTS.length]!;
}

export function avatarGradientForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % SE_AVATAR_GRADIENTS.length;
  }
  return SE_AVATAR_GRADIENTS[hash]!;
}
