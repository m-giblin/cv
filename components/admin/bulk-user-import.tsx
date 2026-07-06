"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const TEMPLATE_CSV =
  "fullName,email,role,level,managerEmail\nAlex Rivera,alex.rivera@sailpoint.com,basic_se,Basic,manager@sailpoint.com";

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
    <div className="mt-[14px] rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
      <div className="flex items-start gap-[14px]">
        <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8f2fc]">
          <svg fill="none" height="18" stroke="#0071ce" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 16 16" width="18">
            <path d="M2 13h12M8 2v9M5 6l3-4 3 4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="mb-[2px] text-[12.5px] font-bold text-[#0a1628]">Bulk import users</p>
          <p className="mb-[10px] text-[11px] text-[#64748b]">
            Upload a CSV with columns: email, full_name, role, level, manager_email
          </p>
          <div className="flex gap-[8px]">
            <button
              className="inline-flex items-center rounded-lg bg-[#0071ce] px-[13px] py-[6px] text-[11.5px] font-semibold text-white disabled:opacity-60"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Choose CSV file
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-[#e2eaf5] bg-white px-[13px] py-[6px] text-[11.5px] font-semibold text-[#334155]"
              onClick={downloadTemplate}
              type="button"
            >
              Download template →
            </button>
          </div>
          <input accept=".csv,text/csv" className="hidden" onChange={(e) => void handleFileSelect(e)} ref={fileInputRef} type="file" />
          {results.length > 0 ? (
            <div className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-[#64748b]">
              {results.map((row) => (
                <p key={`${row.line}-${row.email}`}>
                  Line {row.line}: {row.email} — {row.status} {row.message ?? ""}
                </p>
              ))}
            </div>
          ) : csv !== TEMPLATE_CSV ? (
            <p className="mt-3 text-[10.5px] text-[#94a3b8]">Loaded CSV ready for import ({csv.split("\n").length} lines).</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
