import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
 return (
 <AuthShell
 description="We'll email you a secure link to reset your password. Only @sailpoint.com accounts are supported."
 eyebrow="Password recovery"
 title="Reset your password"
 >
 <ForgotPasswordForm />
 </AuthShell>
 );
}
