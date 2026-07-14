"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CoachingCadence } from "@/components/manager/coaching-cadence/CoachingCadence";
import { mockProfiles } from "@/components/manager/coaching-cadence/data";
import { ManagerCoachingQualityPanel } from "@/components/manager/manager-coaching-quality-panel";
import type { Profile } from "@/lib/types";

export function ManagerCoachingCadencePanel({ org = [] }: { org?: Profile[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const seParam = searchParams.get("se");
  const profileParam = searchParams.get("profile");
  const initialSelectedKey =
    (seParam && mockProfiles[seParam] ? seParam : null) ??
    (profileParam && mockProfiles[profileParam] ? profileParam : null) ??
    undefined;

  const handleSelectSe = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", "cadence");
      params.set("se", key);
      router.push(`/manager?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-8">
      <CoachingCadence initialSelectedKey={initialSelectedKey} onSelectSe={handleSelectSe} />

      <div className="border border-[#E2DFD9] bg-white p-4">
        <p className="mb-1 font-display text-sm font-extrabold text-[#0D0E12]">
          Coaching quality (30 days)
        </p>
        <p className="mb-3 text-[11px] text-[#6B6860]">
          Structured sign-off patterns — flags fast rubber-stamping and cadence gaps.
        </p>
        <ManagerCoachingQualityPanel orgIds={org.map((profile) => profile.id)} />
      </div>
    </div>
  );
}
