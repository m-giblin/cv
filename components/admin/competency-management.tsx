"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
 EmptyState,
 Field,
 LineCard,
 LinkButton,
 Mono,
 Switch,
 TextArea,
 TextInput,
} from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";

type CompetencyRow = {
 id: string;
 name: string;
 category: string;
 description: string | null;
 rubric: Array<{ level: number; label: string; description: string }>;
};

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
 <div className="flex flex-col gap-6">
 <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
 <LineCard title="Add competency">
 <p className="mb-4 text-sm text-muted">Framework spine for goals, coaching cards, and gap analysis.</p>
 <form className="flex flex-col gap-4" onSubmit={create}>
 <Field htmlFor="competency-name" label="Name">
 <TextInput id="competency-name" onChange={(e) => setName(e.target.value)} required value={name} />
 </Field>
 <Field htmlFor="competency-category" label="Category">
 <TextInput
 id="competency-category"
 onChange={(e) => setCategory(e.target.value)}
 required
 value={category}
 />
 </Field>
 <Field htmlFor="competency-description" label="Description">
 <TextArea
 id="competency-description"
 onChange={(e) => setDescription(e.target.value)}
 value={description}
 />
 </Field>
 <div>
 <button className="btn-primary" disabled={isSaving} type="submit">
 {isSaving ? "Saving…" : "Add competency"}
 </button>
 </div>
 </form>
 </LineCard>

 <LineCard bodyClassName="p-0" meta={`${items.length} total`} title="Framework">
 {items.length === 0 ? (
 <EmptyState>No competencies yet.</EmptyState>
 ) : (
 <ul>
 {items.map((item) => {
 const enabled = enabledById[item.id] ?? true;
 return (
 <li
 className="flex flex-wrap items-center gap-4 border-b border-divider px-5 py-3.5 last:border-b-0"
 key={item.id}
 >
 <div className="min-w-0 flex-1">
 <div className="mb-1 flex flex-wrap items-center gap-2">
 <span className="text-[15px] font-bold text-ink">{item.name}</span>
 <Tag tone="blue">{item.category}</Tag>
 </div>
 <p className="text-sm leading-[1.5] text-ink-2">{item.description ?? "No description yet."}</p>
 </div>
 <Mono className="shrink-0 text-muted">{item.rubric.length} rubric levels</Mono>
 <div className="flex shrink-0 items-center gap-4">
 <Switch
 checked={enabled}
 label={`${item.name} enabled`}
 onChange={(checked) => setEnabledById((current) => ({ ...current, [item.id]: checked }))}
 />
 <LinkButton aria-label={`Delete ${item.name}`} onClick={() => void remove(item.id)} tone="danger">
 Delete
 </LinkButton>
 </div>
 </li>
 );
 })}
 </ul>
 )}
 </LineCard>
 </div>
 </div>
 );
}
