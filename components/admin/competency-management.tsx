"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/admin/admin-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CompetencyRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  rubric: Array<{ level: number; label: string; description: string }>;
};

const ICON_PALETTE = [
  { iconBg: "#e8f2fc", iconColor: "#0071ce" },
  { iconBg: "#fdf0fa", iconColor: "#cc27b0" },
  { iconBg: "#ede9fe", iconColor: "#7c3aed" },
  { iconBg: "#dcfce7", iconColor: "#15803d" },
];

function CompetencyIcon({ color }: { color: string }) {
  return (
    <svg fill="none" height="16" stroke={color} strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 16 16" width="16">
      <path d="M8 2l1.8 3.6L14 6.4l-3 2.9.7 4.1L8 11.2 4.3 13.4 5 9.3 2 6.4l4.2-.8L8 2z" />
    </svg>
  );
}

export function CompetencyManagement() {
  const [items, setItems] = useState<CompetencyRow[]>([]);
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/competencies");
    if (response.ok) {
      const body = (await response.json()) as { competencies: CompetencyRow[] };
      setItems(body.competencies);
      setEnabledById((current) => {
        const next = { ...current };
        for (const item of body.competencies) {
          if (!(item.id in next)) {
            next[item.id] = true;
          }
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    const response = await fetch("/api/admin/competencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, description }),
    });
    if (!response.ok) {
      toast.error("Could not create competency.");
      setIsSaving(false);
      return;
    }
    setName("");
    setDescription("");
    setIsSaving(false);
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/competencies/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <p className="text-[12.5px] font-bold text-[#0a1628]">Add competency</p>
        <p className="mb-[14px] mt-[2px] text-[11px] text-[#64748b]">
          Framework spine for goals, coaching cards, and gap analysis.
        </p>
        <form className="space-y-3" onSubmit={create}>
          <Input onChange={(e) => setName(e.target.value)} placeholder="Name" required value={name} />
          <Input onChange={(e) => setCategory(e.target.value)} placeholder="Category" required value={category} />
          <Textarea onChange={(e) => setDescription(e.target.value)} placeholder="Description" value={description} />
          <Button disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add competency
          </Button>
        </form>
      </div>
      <div className="space-y-[10px]">
        {items.map((item, index) => {
          const palette = ICON_PALETTE[index % ICON_PALETTE.length]!;
          const teamAvg =
            item.rubric.length > 0
              ? (item.rubric.reduce((sum, level) => sum + level.level, 0) / item.rubric.length).toFixed(1)
              : "—";
          return (
            <div
              className="flex items-center gap-[14px] rounded-xl border border-[#e2eaf5] bg-white p-[14px_18px]"
              key={item.id}
            >
              <div
                className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: palette.iconBg }}
              >
                <CompetencyIcon color={palette.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[3px] flex items-center gap-[8px]">
                  <span className="text-[12.5px] font-bold text-[#0a1628]">{item.name}</span>
                  <span className="rounded-full bg-[#e8f2fc] px-[8px] py-[2px] text-[9.5px] font-bold text-[#0057a8]">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11.5px] leading-[1.5] text-[#64748b]">
                  {item.description ?? "No description yet."}
                </p>
              </div>
              <div className="flex-shrink-0 text-center">
                <p className="font-display text-[18px] font-extrabold text-[#0a1628]">{teamAvg}</p>
                <p className="text-[9px] text-[#94a3b8]">Team avg</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-[7px]">
                <button
                  className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                  type="button"
                >
                  Edit
                </button>
                <Toggle
                  checked={enabledById[item.id] ?? true}
                  onChange={(checked) => setEnabledById((current) => ({ ...current, [item.id]: checked }))}
                />
                <Button onClick={() => void remove(item.id)} size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
