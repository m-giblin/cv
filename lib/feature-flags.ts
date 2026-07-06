/** Feature flags — set NEXT_PUBLIC_NORTHSTAR_UI=false to revert to legacy shell. */
export function isNorthstarUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NORTHSTAR_UI !== "false";
}
