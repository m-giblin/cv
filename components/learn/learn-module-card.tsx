"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearnModule } from "@/lib/learn/agentic-curriculum";

export function LearnModuleCard({ module }: { module: LearnModule }) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/learn/progress");
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const body = (await response.json()) as { progress: { module_id: string }[] };
      setCompleted(body.progress.some((row) => row.module_id === module.id));
      setLoading(false);
    })();
  }, [module.id]);

  async function markComplete() {
    setSaving(true);
    const response = await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: module.id }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save progress.");
      return;
    }
    setCompleted(true);
    toast.success("Module marked complete.");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{module.emoji}</span>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              {module.title}
              {completed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
            </CardTitle>
            <CardDescription>{module.summary}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-sp-navy-muted">
          {module.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a className="text-sm font-semibold text-sp-blue hover:underline" href={module.href}>
            Practice →
          </a>
          <a className="text-sm font-semibold text-sp-magenta hover:underline" href="/market-pulse">
            Market pulse →
          </a>
          <a className="text-sm font-semibold text-sp-blue hover:underline" href="/lab">
            ISC Lab →
          </a>
          {!completed ? (
            <Button disabled={loading || saving} onClick={() => void markComplete()} size="sm" type="button" variant="outline">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark complete"}
            </Button>
          ) : (
            <span className="text-xs font-semibold text-emerald-700">Track complete</span>
          )}
        </div>
      </div>
    </Card>
  );
}
