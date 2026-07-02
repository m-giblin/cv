"use client";

import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function BulkUserImport() {
  const [csv, setCsv] = useState(
    "fullName,email,role,level,managerEmail\nAlex Rivera,alex.rivera@sailpoint.com,basic_se,Basic,manager@sailpoint.com",
  );
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<Array<{ line: number; email: string; status: string; message?: string }>>([]);

  async function handleImport(event: React.FormEvent) {
    event.preventDefault();
    setIsImporting(true);

    const response = await fetch("/api/admin/users/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-sp-blue" />
          Bulk CSV import
        </CardTitle>
        <CardDescription>Columns: fullName, email, role, level, managerEmail. @sailpoint.com only.</CardDescription>
      </CardHeader>
      <form className="space-y-4" onSubmit={handleImport}>
        <Textarea onChange={(e) => setCsv(e.target.value)} rows={8} value={csv} />
        <Button disabled={isImporting} type="submit">
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Import users
        </Button>
      </form>
      {results.length > 0 ? (
        <div className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs">
          {results.map((row) => (
            <p key={`${row.line}-${row.email}`}>
              Line {row.line}: {row.email} — {row.status} {row.message ?? ""}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
