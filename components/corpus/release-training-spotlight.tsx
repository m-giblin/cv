"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReleaseTrainingSpotlight({
  projectTags,
}: {
  projectTags: string[];
}) {
  if (projectTags.length === 0) return null;

  return (
    <Card className="border-[#0071ce]/25 bg-gradient-to-br from-[#0071ce]/8 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-[#0071ce]" />
          New release training
        </CardTitle>
        <CardDescription>
          Your manager assigned just-in-time training for: {projectTags.join(", ")}.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2 px-6 pb-6">
        <Button asChild size="sm">
          <Link href={`/resources?projectTag=${encodeURIComponent(projectTags[0])}`}>Open resources</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/lab">Practice in ISC Lab</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/my-plan">View plan steps</Link>
        </Button>
      </div>
    </Card>
  );
}
