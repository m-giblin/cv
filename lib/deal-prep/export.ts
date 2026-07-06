import type { DealPrepOutput } from "@/lib/ai/schemas";

export function formatPrepAsMarkdown(result: DealPrepOutput, meetingMode = false): string {
  const lines: string[] = [
    `# Deal prep: ${result.accountName}`,
    "",
    result.executiveSummary,
    "",
  ];

  if (!meetingMode && result.oneThingToNail) {
    lines.push(`**One thing to nail:** ${result.oneThingToNail}`, "");
  }

  if (meetingMode) {
    appendSection(lines, "Top discovery questions", result.discoveryQuestions.slice(0, 3));
    appendSection(lines, "Likely objections", result.likelyObjections.slice(0, 2));
    if (result.oneThingToNail) {
      lines.push(`**Focus:** ${result.oneThingToNail}`, "");
    }
    return lines.join("\n");
  }

  appendSection(lines, "Stakeholder map", result.stakeholderMap ?? []);
  appendSection(lines, "Discovery questions", result.discoveryQuestions);
  appendSection(lines, "Likely objections", result.likelyObjections);
  appendSection(lines, "Competitive landmines", result.competitiveLandmines ?? []);
  appendSection(lines, "Proof points to bring", result.proofPoints ?? []);
  appendSection(lines, "Risk flags", result.riskFlags ?? []);
  appendSection(lines, "Talk track outline", result.talkTrackOutline);
  appendSection(lines, "Recommended resources", result.linkedResources ?? []);

  return lines.join("\n");
}

function appendSection(lines: string[], title: string, items: string[]) {
  if (!items.length) return;
  lines.push(`## ${title}`, "");
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  lines.push("");
}
