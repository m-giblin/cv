/** Days a submission must be pending before any reminder (auto or manual). */
export const REVIEW_REMINDER_MIN_PENDING_DAYS = 5;

/** Cooldown between reminders for the same review item (auto + manual share this). */
export const REVIEW_REMINDER_COOLDOWN_DAYS = 7;

export type ReviewReminderKind = "challenge" | "coaching";
export type ReviewReminderSource = "auto" | "se_nudge";
