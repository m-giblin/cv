"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { LineCard, Meta, SecondaryButton } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/ui/status-pill";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/email-domain";

const TEMPLATE_CSV = `fullName,email,role,level,managerEmail\nAlex Rivera,alex.rivera@${ALLOWED_EMAIL_DOMAIN},basic_se,Basic,manager@${ALLOWED_EMAIL_DOMAIN}`;

function statusTone(status: string): "success" | "danger" | "neutral" {
 if (status === "created") return "success";
 if (status === "error" || status === "failed") return "danger";
 return "neutral";
}

function statusLabel(status: string) {
 if (status === "created") return "Created";
 if (status === "error" || status === "failed") return "Failed";
 return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

export function BulkUserImport() {
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [csv, setCsv] = useState(TEMPLATE_CSV);
 const [isImporting, setIsImporting] = useState(false);
 const [results, setResults] = useState<Array<{ line: number; email: string; status: string; message?: string }>>([]);

 async function handleImport(csvPayload: string) {
 setIsImporting(true);

 const response = await fetch("/api/admin/users/import", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ csv: csvPayload }),
 });

 if (!response.ok) {
 toast.error("Import failed.");
 setIsImporting(false);
 return;
 }

 const body = (await response.json()) as { results: typeof results };
 setResults(body.results);
 toast.success(`Imported ${body.results.filter((row) => row.status === "created").length} users.`);
 setIsImporting(false);
 }

 async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.target.files?.[0];
 if (!file) return;
 const text = await file.text();
 setCsv(text);
 await handleImport(text);
 event.target.value = "";
 }

 function downloadTemplate() {
 const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = "user-import-template.csv";
 anchor.click();
 URL.revokeObjectURL(url);
 }

 return (
 <LineCard
 actions={
 <>
 <SecondaryButton disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
 {isImporting ? "Importing…" : "Choose CSV file"}
 </SecondaryButton>
 <SecondaryButton onClick={downloadTemplate}>Download template</SecondaryButton>
 </>
 }
 title="Bulk import users"
 >
 <p className="text-sm text-ink-2">
 Upload a CSV with these columns: <span className="font-semibold text-ink">fullName, email, role, level, managerEmail</span>.
 </p>
 <input
 accept=".csv,text/csv"
 aria-label="CSV file to import"
 className="hidden"
 onChange={(e) => void handleFileSelect(e)}
 ref={fileInputRef}
 type="file"
 />
 {results.length > 0 ? (
 <ul className="mt-4 max-h-56 overflow-y-auto rounded-[10px] border border-line">
 {results.map((row) => (
 <li
 className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-2.5 text-sm text-ink last:border-b-0"
 key={`${row.line}-${row.email}`}
 >
 <Meta>Line {row.line}</Meta>
 <span className="min-w-0 flex-1 truncate">{row.email}</span>
 <StatusPill tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusPill>
 {row.message ? <span className="w-full text-[13px] text-muted">{row.message}</span> : null}
 </li>
 ))}
 </ul>
 ) : csv !== TEMPLATE_CSV ? (
 <p className="mt-3 text-[13px] text-muted">The loaded CSV is ready to import. It has {csv.split("\n").length} lines.</p>
 ) : null}
 </LineCard>
 );
}
