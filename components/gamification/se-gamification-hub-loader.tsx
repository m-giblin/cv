"use client";

import { useEffect, useState } from "react";
import { SeGamificationHub } from "@/components/gamification/se-gamification-hub";
import type { SeScorecard } from "@/lib/gamification/se-scorecard";

export function SeGamificationHubLoader() {
  const [scorecard, setScorecard] = useState<SeScorecard | null>(null);

  useEffect(() => {
    void fetch("/api/gamification/scorecard")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (body?.scorecard) setScorecard(body.scorecard as SeScorecard);
      });
  }, []);

  if (!scorecard) return null;
  return <SeGamificationHub scorecard={scorecard} />;
}
