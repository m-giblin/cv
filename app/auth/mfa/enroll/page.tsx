import { MfaEnrollLeftPanel } from "@/components/auth/mfa-enroll-left-panel";
import { MfaEnrollRightPanel } from "@/components/auth/mfa-enroll-right-panel";

export default function MfaEnrollPage() {
 return (
 <div className="flex min-h-screen">
 <MfaEnrollLeftPanel />
 <MfaEnrollRightPanel />
 </div>
 );
}
