const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** "two" for 2, digits from 13 up. Pass `capital` for the start of a sentence. */
export function numberWord(n: number, capital = false): string {
  const word = WORDS[n] ?? String(n);
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

/** Inbox and table ages: "Today", "1 day", "4 days". */
export function ageWords(days: number | null): string {
  if (days === null) return "Unknown";
  if (days <= 0) return "Today";
  return `${days} ${plural(days, "day")}`;
}

/** Ends a phrase with a full stop unless it already has closing punctuation. */
export function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
