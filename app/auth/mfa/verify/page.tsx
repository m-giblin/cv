import { MfaLeftPanel } from "@/components/auth/mfa-left-panel";
import { MfaRightPanel } from "@/components/auth/mfa-right-panel";

export default function MfaVerifyPage() {
  return (
    <div className="flex min-h-screen">
      <MfaLeftPanel />
      <MfaRightPanel />
    </div>
  );
}
