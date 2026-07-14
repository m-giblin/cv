// ============================================================
// utils/mailto.ts — Build mailto: href for post-session note
// ============================================================
// IMPORTANT: Populate se.email in your data layer.
// Currently opens the default mail client with a blank To: field.
// Swap window.location.href for window.open() if you prefer a new tab.
//
// Production upgrade path:
// Replace with Microsoft Graph API POST /me/chats/{chatId}/messages
// to send via Teams instead of email.
// ============================================================
import type { SEProfile } from '../types';

export function buildMailto(se: SEProfile, noteText: string): string {
  const subject = encodeURIComponent(
    'Coaching session notes — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const body = encodeURIComponent(
    `Hi ${se.name},\n\nHere are notes from our coaching session today:\n\n${noteText.trim()}\n\nLet me know if you have any questions.\n\nThanks`
  );
  // Use se.email when populated: `mailto:${se.email}?subject=...`
  return `mailto:${se.email || ''}?subject=${subject}&body=${body}`;
}
