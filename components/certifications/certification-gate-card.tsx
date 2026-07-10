"use client";

import {
 CheckCircle2,
 ExternalLink,
 Loader2,
 Trophy,
 XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ScoreRing } from "@/components/se/northstar-animated";
import { SP_BLUE_BTN, SP_INPUT_CLS, SP_TEXTAREA_CLS } from "@/components/se/sp-form-primitives";
import { createClient } from "@/lib/supabase/client";
import {
 CERT_DETAILS,
 type CertType,
 certLabel,
 stageForCert,
 statusActionLabel,
} from "@/lib/certifications/gate-metadata";

type Certification = {
 id: string;
 certification_type: string;
 status: string;
 evidence_text: string | null;
 evidence_url: string | null;
 manager_notes: string | null;
 approved_at: string | null;
};

function statusPill(status: string) {
 const label = status.replaceAll("_", " ");
 const styles: Record<string, string> = {
 not_started: "bg-[#ECEAE6] text-[#6B6860]",
 submitted: "bg-[#fef3c7] text-[#b45309]",
 approved: "bg-[#dcfce7] text-[#15803d]",
 revoked: "bg-[#fee2e2] text-[#dc2626]",
 };
 return (
 <span
 className={`shrink-0 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.08em] px-[9px] py-[3px] text-[9.5px] font-bold ${styles[status] ?? styles.not_started}`}
 >
 {label}
 </span>
 );
}

export function CertificationGateCard({
 cert,
 isManager,
 isSelf,
 isLocked,
 prerequisiteLabel,
 onReload,
}: {
 cert: Certification;
 isManager: boolean;
 isSelf: boolean;
 isLocked: boolean;
 prerequisiteLabel?: string;
 onReload: () => void;
}) {
 const type = cert.certification_type as CertType;
 const details = CERT_DETAILS[type];
 const stage = stageForCert(type);
 const [evidenceText, setEvidenceText] = useState(cert.evidence_text ?? "");
 const [evidenceUrl, setEvidenceUrl] = useState(cert.evidence_url ?? "");
 const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
 const [managerNotes, setManagerNotes] = useState("");
 const [isSaving, setIsSaving] = useState(false);

 const canSubmit = isSelf && !isManager && !isLocked && (cert.status === "not_started" || cert.status === "revoked");
 const canReview = isManager && cert.status === "submitted";
 const isOpen = canSubmit && !isLocked;
 const titleColor = isLocked ? "#3D3C38" : "#0D0E12";

 async function submit() {
 setIsSaving(true);
 let evidencePath = "";

 if (evidenceFile) {
 const supabase = createClient();
 if (!supabase) {
 toast.error("Storage not configured.");
 setIsSaving(false);
 return;
 }
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 setIsSaving(false);
 return;
 }
 const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
 evidencePath = `${user.id}/${Date.now()}-${safeName}`;
 const { error: uploadError } = await supabase.storage.from("evidence").upload(evidencePath, evidenceFile);
 if (uploadError) {
 toast.error("Upload failed.");
 setIsSaving(false);
 return;
 }
 }

 const response = await fetch("/api/certifications", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 certificationType: cert.certification_type,
 evidenceText,
 evidenceUrl: evidencePath ? "" : evidenceUrl,
 evidencePath: evidencePath || undefined,
 }),
 });

 setIsSaving(false);

 if (!response.ok) {
 toast.error("Submission failed — include at least 20 characters of evidence.");
 return;
 }

 toast.success("Submitted for manager approval.");
 onReload();
 }

 async function review(status: "approved" | "revoked") {
 setIsSaving(true);
 const response = await fetch(`/api/certifications/${cert.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 status,
 managerNotes:
 managerNotes.trim() ||
 (status === "approved" ? "Cleared for field readiness." : "Needs more evidence before sign-off."),
 }),
 });

 setIsSaving(false);

 if (!response.ok) {
 toast.error("Review failed.");
 return;
 }

 toast.success(status === "approved" ? "Certification approved." : "Sent back for more evidence.");
 onReload();
 }

 return (
 <div
 className={`bg-white p-[16px_18px] ${isLocked ? "border-[1.5px] border-[#E2DFD9] opacity-[0.68]" : ""}`}
 style={
 isLocked
 ? undefined
 : isOpen
 ? { border: "2px solid rgba(0,113,206,0.18)", }
 : cert.status === "submitted" && isManager
 ? { border: "2px solid rgba(245,158,11,0.25)", }
 : { border: "1.5px solid #E2DFD9" }
 }
 >
 <div className="mb-2 flex items-start justify-between">
 <div>
 <p className="mb-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#6B6860]">
 {details?.careerLevel ?? stage?.title ?? "Field readiness"} · Field readiness
 </p>
 <p className="text-[13.5px] font-bold" style={{ color: titleColor }}>
 {certLabel(cert.certification_type)}
 </p>
 </div>
 {statusPill(cert.status)}
 </div>

 <p className={`mb-3 text-[11.5px] leading-[1.6] ${isLocked ? "text-[#A09D98]" : "text-[#6B6860]"}`}>
 {details?.description ?? "Field readiness gate — evidence + manager sign-off."}
 </p>

 {isLocked && prerequisiteLabel ? (
 <p className="flex items-center gap-[5px] text-[10.5px] text-[#A09D98]">
 <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#A09D98" strokeWidth="1.5" strokeLinecap="round">
 <rect height="8" rx="1" width="10" x="3" y="7" />
 <path d="M5 7V5a3 3 0 016 0v2" />
 </svg>
 {prerequisiteLabel}
 </p>
 ) : null}

 {!isLocked && cert.status !== "approved" ? (
 <p className="mb-2.5 text-[10.5px] font-semibold text-[#0071ce]">{statusActionLabel(cert.status, isManager)}</p>
 ) : null}

 {cert.evidence_text ? (
 <div className="mb-3 border border-[#E2DFD9] bg-[#F9F8F6] p-3">
 <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6B6860]">Evidence</p>
 <p className="mt-1 text-[12px] leading-[1.55] text-[#374151]">{cert.evidence_text}</p>
 {cert.evidence_url ? (
 <a
 className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071ce]"
 href={cert.evidence_url}
 rel="noopener noreferrer"
 target="_blank"
 >
 View attachment <ExternalLink className="h-3 w-3" />
 </a>
 ) : null}
 </div>
 ) : null}

 {cert.manager_notes && cert.status !== "not_started" ? (
 <div className="mb-3 border border-[#E2DFD9] p-3">
 <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6B6860]">Manager notes</p>
 <p className="mt-1 text-[12px] leading-[1.55] text-[#374151]">{cert.manager_notes}</p>
 {cert.approved_at ? (
 <p className="mt-1 text-[10px] text-[#A09D98]">Reviewed {new Date(cert.approved_at).toLocaleDateString()}</p>
 ) : null}
 </div>
 ) : null}

 {isOpen ? (
 <div className="mb-2 border border-[#E2DFD9] bg-[#F9F8F6] p-3">
 <p className="mb-2 text-[11px] text-[#6B6860]">{details?.evidenceHint}</p>
 <label className="mb-[5px] block text-[10.5px] font-semibold text-[#3D3C38]">Evidence description *</label>
 <textarea
 className={SP_TEXTAREA_CLS}
 onChange={(event) => setEvidenceText(event.target.value)}
 placeholder="Describe what you did, who was in the room, and the outcome..."
 rows={3}
 value={evidenceText}
 />
 <label className="mb-[5px] mt-2 block text-[10.5px] font-semibold text-[#3D3C38]">
 Link to recording or recap (optional)
 </label>
 <input
 className={SP_INPUT_CLS}
 onChange={(event) => setEvidenceUrl(event.target.value)}
 placeholder="https://..."
 type="text"
 value={evidenceUrl}
 />
 <input
 accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.pptx,.txt"
 className="mt-2 block w-full text-[11px] text-[#6B6860]"
 onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
 type="file"
 />
 <button
 className={`${SP_BLUE_BTN} mt-2.5 w-full`}
 disabled={isSaving || evidenceText.trim().length < 20}
 onClick={() => void submit()}
 type="button"
 >
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 Submit for approval
 </button>
 </div>
 ) : null}

 {canReview ? (
 <div className="space-y-3 border border-[#fde68a] bg-[#fef9ec] p-3">
 <textarea
 className={SP_TEXTAREA_CLS}
 onChange={(event) => setManagerNotes(event.target.value)}
 placeholder="Optional sign-off notes for the SE..."
 rows={2}
 value={managerNotes}
 />
 <div className="flex flex-wrap gap-2">
 <button className={SP_BLUE_BTN} disabled={isSaving} onClick={() => void review("approved")} type="button">
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
 Approve
 </button>
 <button
 className="inline-flex items-center gap-[5px] border border-[#E2DFD9] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#3D3C38]"
 disabled={isSaving}
 onClick={() => void review("revoked")}
 type="button"
 >
 <XCircle className="h-4 w-4" />
 Send back
 </button>
 </div>
 </div>
 ) : null}

 {cert.status === "approved" ? (
 <div className="flex items-center gap-2 text-[12px] font-semibold text-[#15803d]">
 <Trophy className="h-4 w-4" />
 Cleared for field readiness
 </div>
 ) : null}
 </div>
 );
}

export function CertificationProgressHero({
 clearedCount,
 totalCount,
 nextMilestone,
 readinessPercent,
}: {
 clearedCount: number;
 totalCount: number;
 nextMilestone?: string;
 readinessPercent?: number;
}) {
 const pct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

 return (
 <div className="mb-[18px] flex items-center gap-6 border border-[#E2DFD9] bg-white p-[18px_22px] ">
 <ScoreRing
 centerSub={`of ${totalCount}`}
 centerValue={String(clearedCount)}
 labelClassName="text-[#0D0E12]"
 percent={pct}
 progressClassName="stroke-[#0071ce]"
 size={80}
 strokeWidth={10}
 subClassName="text-[#A09D98]"
 trackClassName="stroke-[#e8f2fc]"
 />
 <div className="flex-1">
 <p className="text-[13.5px] font-bold text-[#0D0E12]">
 {clearedCount} of {totalCount} gates cleared
 </p>
 {nextMilestone ? (
 <p className="mt-1 text-[12px] text-[#6B6860]">
 Next milestone: {nextMilestone}
 {readinessPercent !== undefined ? ` · ${readinessPercent}% readiness` : ""}
 </p>
 ) : (
 <p className="mt-1 text-[12px] text-[#15803d]">All advisory gates cleared — top of the ladder.</p>
 )}
 <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#e8f2fc]">
 <div className="prog-fill h-full rounded-full bg-[#0071ce]" style={{ width: `${pct}%` }} />
 </div>
 </div>
 </div>
 );
}

export function certGateLocked(
 cert: Certification,
 approvedCerts: string[],
 order: CertType[],
): boolean {
 if (cert.status === "approved" || cert.status === "submitted") return false;
 const index = order.indexOf(cert.certification_type as CertType);
 if (index <= 0) return false;
 return !approvedCerts.includes(order[index - 1]!);
}

export function certPrerequisiteLabel(type: CertType, order: CertType[]): string | undefined {
 const index = order.indexOf(type);
 if (index <= 0) return undefined;
 return `Complete ${certLabel(order[index - 1]!)} first to unlock`;
}
