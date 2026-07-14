import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Profile } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Drop duplicate profile rows while preserving first occurrence order. */
export function uniqueProfiles(profiles: Profile[]): Profile[] {
  const seen = new Set<string>();
  const result: Profile[] = [];
  for (const profile of profiles) {
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    result.push(profile);
  }
  return result;
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
