import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { IscLabChat } from "@/components/lab/isc-lab-chat";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireLabPageAccess } from "@/lib/auth/require-access";

export default async function LabPage() {
 const { data } = await requireLabPageAccess();

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Readiness · AI coach"
 headerRight={
 <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f2fc] px-3 py-1.5">
 <Sparkles className="h-3 w-3 text-[#0071ce]" />
 <span className="text-[11px] font-bold text-[#0057a8]">Grok-powered · cited sources</span>
 </div>
 }
 subtitle="Searches SailPoint docs, developer hub, battlecards, and peer golden pitches — every answer cites what was consulted with fetch timestamps"
 title="ISC Lab"
 >
 <IscLabChat />
 </SEPageLayout>
 </AppShell>
 );
}
