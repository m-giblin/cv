/**
 * Shallow-compares a form's current state against its last-saved snapshot.
 * Used across Platform console tab panels so "did this actually save" is a
 * visible, consistent signal instead of each panel inventing its own (or,
 * as happened once, silently not tracking it at all).
 */
export function isFormDirty<T>(current: T, saved: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(saved);
}
