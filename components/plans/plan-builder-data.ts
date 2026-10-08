"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DbTemplate } from "@/lib/admin/plan-builder";
import { sortPlanTemplates } from "@/lib/plans/template-catalog";

export type LibraryKind = "sim" | "challenge" | "module";

export type LibraryItem = {
  key: string;
  kind: LibraryKind;
  id: string;
  title: string;
  minutes: number | null;
  /** Content assets only. */
  url?: string;
  /** Simulation templates only. */
  persona?: string | null;
};

export type CompetencyOption = { id: string; name: string };

type ContentAsset = { id: string; title: string; url: string };
type Challenge = { id: string; title: string; estimated_minutes?: number | null };
type SimTemplate = {
  id: string;
  name: string;
  persona?: string | null;
  goals?: string[];
  passMark?: number | null;
  competency?: string | null;
};

/** Loads plan templates and the pickers the builder links to. Every list comes from the existing APIs. */
export function usePlanBuilderData() {
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [simTemplates, setSimTemplates] = useState<SimTemplate[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyOption[] | null>(null);

  const loadTemplates = useCallback(async () => {
    const response = await fetch("/api/plans/templates");
    if (!response.ok) {
      toast.error("Failed to load plan templates.");
      setLoading(false);
      return [] as DbTemplate[];
    }
    const body = (await response.json()) as { templates: DbTemplate[] };
    const sorted = sortPlanTemplates(body.templates ?? []);
    setTemplates(sorted);
    setLoading(false);
    return sorted;
  }, []);

  useEffect(() => {
    void loadTemplates();
    void (async () => {
      const [contentRes, challengeRes, simRes, competencyRes] = await Promise.all([
        fetch("/api/content"),
        fetch("/api/challenges"),
        fetch("/api/simulations/assignments"),
        fetch("/api/admin/competencies"),
      ]);
      if (contentRes.ok) setAssets(((await contentRes.json()) as { assets?: ContentAsset[] }).assets ?? []);
      if (challengeRes.ok) {
        setChallenges(((await challengeRes.json()) as { challenges?: Challenge[] }).challenges ?? []);
      }
      if (simRes.ok) setSimTemplates(((await simRes.json()) as { templates?: SimTemplate[] }).templates ?? []);
      // Managers on /plans cannot read the admin competency list; the field falls back to free text.
      if (competencyRes.ok) {
        const body = (await competencyRes.json()) as { competencies?: CompetencyOption[] };
        setCompetencies(body.competencies ?? []);
      }
    })();
  }, [loadTemplates]);

  const library: LibraryItem[] = [
    ...simTemplates.map((sim) => ({
      key: `sim-${sim.id}`,
      kind: "sim" as const,
      id: sim.id,
      title: sim.name,
      minutes: null,
      persona: sim.persona ?? null,
    })),
    ...challenges.map((challenge) => ({
      key: `challenge-${challenge.id}`,
      kind: "challenge" as const,
      id: challenge.id,
      title: challenge.title,
      minutes: typeof challenge.estimated_minutes === "number" ? challenge.estimated_minutes : null,
    })),
    ...assets.map((asset) => ({
      key: `module-${asset.id}`,
      kind: "module" as const,
      id: asset.id,
      title: asset.title,
      minutes: null,
      url: asset.url,
    })),
  ];

  return { templates, loading, loadTemplates, assets, challenges, simTemplates, competencies, library };
}
