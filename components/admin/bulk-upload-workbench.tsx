"use client";

import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { PEOPLE_CSV_COLUMNS, PEOPLE_CSV_TEMPLATE, csvCell } from "@/lib/admin/people-csv";

type RowResult = {
  line: number;
  fullName: string;
  email: string;
  role: string;
  level: string;
  managerEmail: string;
  status: "new" | "exists" | "problem" | "created" | "error";
  message?: string;
};

type ExportPerson = { id: string; full_name: string; email: string; role: string; level: string; manager_id: string | null };

const STATUS: Record<RowResult["status"], { tone: StatusTone; label: string }> = {
  new: { tone: "blue", label: "New" },
  exists: { tone: "neutral", label: "Already exists" },
  problem: { tone: "danger", label: "Problem" },
  created: { tone: "success", label: "Added, inactive" },
  error: { tone: "danger", label: "Failed" },
};

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Bulk upload in three steps: get the template (or the current list), upload and preview every row,
 * then add the new people. They arrive inactive; activate and invite them from the People list.
 */
export function BulkUploadWorkbench({ people, onClose, onImported }: { people: ExportPerson[]; onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function send(mode: "preview" | "import", text = csv) {
    setBusy(mode);
    setError("");
    const response = await fetch("/api/admin/users/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, mode }),
    });
    const body = (await response.json().catch(() => null)) as { results?: RowResult[]; error?: string } | null;
    setBusy(null);
    if (!response.ok || !body?.results) {
      setError(body?.error ?? "Couldn't read that file.");
      return;
    }
    setResults(body.results);
    if (mode === "import") {
      const added = body.results.filter((row) => row.status === "created").length;
      toast.success(`${added} ${added === 1 ? "person" : "people"} added as inactive`);
      setDone(true);
      onImported();
    }
  }

  function exportCurrent() {
    const emailById = new Map(people.map((person) => [person.id, person.email]));
    const lines = people.map((person) =>
      [person.full_name, person.email, person.role, person.level, person.manager_id ? (emailById.get(person.manager_id) ?? "") : ""].map(csvCell).join(","),
    );
    download("people.csv", [PEOPLE_CSV_COLUMNS.join(","), ...lines].join("\n"));
  }

  const counts = {
    new: results?.filter((row) => row.status === "new").length ?? 0,
    exists: results?.filter((row) => row.status === "exists").length ?? 0,
    problem: results?.filter((row) => row.status === "problem").length ?? 0,
  };
  const step = done ? 3 : results ? 2 : 1;

  return (
    <Drawer
      footer={
        done ? (
          <button className="btn-primary" onClick={onClose} type="button">
            Done
          </button>
        ) : results ? (
          <>
            <button className="btn-primary" disabled={!counts.new || Boolean(busy)} onClick={() => void send("import")} type="button">
              {busy === "import" ? "Adding" : `Add ${counts.new} ${counts.new === 1 ? "person" : "people"} as inactive`}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setResults(null);
                setCsv("");
                setFileName("");
              }}
              type="button"
            >
              Choose another file
            </button>
          </>
        ) : null
      }
      footerNote="New people can't sign in until you activate them and send their invite."
      onClose={onClose}
      open
      size="form"
      subtitle="Add many people at once. They arrive inactive so you can review them first."
      title="Bulk upload people"
    >
      <div className="flex flex-col gap-5">
        <ol className="flex flex-wrap gap-2 text-sm">
          {["Get the template", "Upload and check", "Add as inactive"].map((label, index) => (
            <li
              aria-current={step === index + 1 ? "step" : undefined}
              className={`rounded-[8px] px-3 py-1 ${step === index + 1 ? "bg-blue-soft font-bold text-blue" : step > index + 1 ? "text-ink" : "text-muted"}`}
              key={label}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        {!results ? (
          <>
            <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4">
              <h3 className="font-bold text-ink">1. Get the template</h3>
              <p className="text-sm text-muted">
                Columns: <span className="font-semibold text-ink">{PEOPLE_CSV_COLUMNS.join(", ")}</span>. Role is basic_se, senior_se,
                advisory_solutions_consultant, mentor, manager, director or admin. Level is Basic, Senior or Advisory. managerEmail can be someone
                already here or someone new in the same file.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary inline-flex items-center gap-2" onClick={() => download("people-template.csv", PEOPLE_CSV_TEMPLATE)} type="button">
                  <Download aria-hidden size={16} /> Download template
                </button>
                <button className="btn-secondary inline-flex items-center gap-2" onClick={exportCurrent} type="button">
                  <Download aria-hidden size={16} /> Export current people
                </button>
              </div>
              <p className="text-[13px] text-muted">
                Exporting gives you everyone already here. Add new rows at the bottom and upload it; existing people are skipped, not changed.
              </p>
            </section>

            <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4">
              <h3 className="font-bold text-ink">2. Upload your file</h3>
              <p className="text-sm text-muted">Every row is checked first. Nothing is added until you confirm.</p>
              <div>
                <button className="btn-primary inline-flex items-center gap-2" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()} type="button">
                  {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <Upload aria-hidden size={16} />}
                  {busy ? "Checking" : "Choose CSV file"}
                </button>
              </div>
              <input
                accept=".csv,text/csv"
                aria-label="CSV file"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const text = await file.text();
                  setCsv(text);
                  setFileName(file.name);
                  await send("preview", text);
                }}
                ref={fileRef}
                type="file"
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </section>
          </>
        ) : (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              <span className="font-bold">{fileName}</span>: {counts.new} new · {counts.exists} already here (skipped) ·{" "}
              <span className={counts.problem ? "font-bold text-danger" : ""}>{counts.problem} with problems</span>
            </p>
            {counts.problem ? <p className="text-[13px] text-muted">Rows with problems are left out. Fix them in the file and upload again any time.</p> : null}
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {results.map((row) => (
                <li className="flex flex-col gap-0.5 border-b border-divider px-4 py-2.5 last:border-b-0" key={`${row.line}-${row.email}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm">
                      <span className="font-bold text-ink">{row.fullName || "No name"}</span> <span className="text-muted">{row.email}</span>
                    </span>
                    <StatusPill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusPill>
                  </span>
                  <span className="text-[13px] text-muted">
                    Line {row.line} · {row.role.replaceAll("_", " ")}, {row.level}
                    {row.message ? ` · ${row.message}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {done ? (
              <p className="rounded-[12px] border border-line bg-white px-4 py-3 text-sm text-ink">
                Next: on the People list, filter to <span className="font-bold">Inactive</span>, tick who to bring in, then click{" "}
                <span className="font-bold">Activate</span> and <span className="font-bold">Send invite</span>.
              </p>
            ) : null}
          </section>
        )}
      </div>
    </Drawer>
  );
}
