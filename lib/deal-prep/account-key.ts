export function normalizeAccountKey(accountName: string): string {
  return accountName.trim().toLowerCase().replace(/\s+/g, " ");
}
