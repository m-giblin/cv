"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CorpusHealthItem } from "@/lib/corpus/health";

export function CorpusHealthAdmin() {
  const [items, setItems] = useState<CorpusHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/corpus/health");
    if (response.ok) {
      const body = (await response.json()) as { items: CorpusHealthItem[] };
      setItems(body.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifyAllLinks() {
    setVerifying(true);
    const response = await fetch("/api/corpus/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verifyAll: true }),
    });
    setVerifying(false);
    if (!response.ok) {
      toast.error("Link verification failed.");
      return;
    }
    const body = (await response.json()) as { verified: number; broken: number };
    toast.success(`Verified ${body.verified} links · ${body.broken} broken`);
    void load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Corpus health
          </CardTitle>
          <CardDescription>Stale, confusing, unused, and broken assets — Highspot-style governance.</CardDescription>
        </div>
        <Button disabled={verifying} onClick={() => void verifyAllLinks()} size="sm" type="button" variant="outline">
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Verify links
        </Button>
      </CardHeader>
      <div className="max-h-64 space-y-2 overflow-y-auto px-6 pb-6">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" />
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">All corpus assets look healthy.</p>
        ) : (
          items.slice(0, 20).map((item) => (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm" key={`${item.id}-${item.issue}`}>
              <div>
                <p className="font-semibold text-stone-800">{item.title}</p>
                <p className="text-xs text-stone-500">{item.detail}</p>
              </div>
              <Badge tone={item.severity === "high" ? "red" : item.severity === "medium" ? "amber" : "slate"}>
                {item.issue.replace("_", " ")}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
