"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CompetencyRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  rubric: Array<{ level: number; label: string; description: string }>;
};

export function CompetencyManagement() {
  const [items, setItems] = useState<CompetencyRow[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/competencies");
    if (response.ok) {
      const body = (await response.json()) as { competencies: CompetencyRow[] };
      setItems(body.competencies);
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
      <Card>
        <CardHeader>
          <CardTitle>Add competency</CardTitle>
          <CardDescription>Framework spine for goals, coaching cards, and gap analysis.</CardDescription>
        </CardHeader>
        <form className="space-y-3" onSubmit={create}>
          <Input onChange={(e) => setName(e.target.value)} placeholder="Name" required value={name} />
          <Input onChange={(e) => setCategory(e.target.value)} placeholder="Category" required value={category} />
          <Textarea onChange={(e) => setDescription(e.target.value)} placeholder="Description" value={description} />
          <Button disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add competency
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Competency library ({items.length})</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {items.map((item) => (
            <div className="flex items-start justify-between rounded-xl border border-sp-blue/10 p-3 text-sm" key={item.id}>
              <div>
                <p className="font-bold text-sp-navy">{item.name}</p>
                <p className="text-xs text-sp-navy-muted">{item.category}</p>
              </div>
              <Button onClick={() => void remove(item.id)} size="sm" variant="ghost">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
