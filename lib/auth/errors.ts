import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/email-domain";

export function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return [
      "Email or password was not accepted.",
      `Use your full @${ALLOWED_EMAIL_DOMAIN} address (not a username).`,
      "If you only added a row to public.profiles, you still need an Auth user with a password in Supabase → Authentication → Users.",
    ].join(" ");
  }

  if (normalized.includes("email not confirmed")) {
    return "Your account exists but the email is not confirmed yet. In Supabase, confirm the user or disable email confirmation for internal testing.";
  }

  if (normalized.includes("user banned")) {
    return "This account is disabled in Supabase Auth.";
  }

  return message;
}
