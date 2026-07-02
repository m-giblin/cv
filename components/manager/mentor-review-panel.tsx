"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type MentorRequest = {
  id: string;
  userId: string;
  topic: string;
  seNotes: string | null;
  status: string;
  createdAt: string;
  seName?: string;
};

export function MentorReviewPanel() {
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/mentor-reviews");
    if (response.ok) {
      const body = (await response.json()) as { requests: MentorRequest[] };
      setRequests(body.requests.filter((item) => item.status === "pending"));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(id: string, decision: "approve" | "reject") {
    const mentorFeedback = feedback[id]?.trim();
    if (!mentorFeedback || mentorFeedback.length < 3) {
      toast.error("Add feedback before completing.");
      return;
    }

    const response = await fetch("/api/mentor-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, mentorFeedback, decision }),
    });

    if (!response.ok) {
      toast.error("Could not save mentor feedback.");
      return;
    }

    toast.success(decision === "approve" ? "Mentor review approved." : "Sent back for revision.");
    void load();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mentor reviews</CardTitle>
          <CardDescription>No pending mentor review requests from your mentees.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentor reviews ({requests.length})</CardTitle>
        <CardDescription>Respond to mentee check-in requests from onboarding plans.</CardDescription>
      </CardHeader>
      <div className="space-y-4">
        {requests.map((request) => (
          <div className="rounded-2xl border border-sp-blue/10 p-4" key={request.id}>
            <p className="font-bold text-sp-navy">{request.seName ?? "SE"} — {request.topic}</p>
            {request.seNotes ? (
              <p className="mt-2 text-sm text-sp-navy-muted">{request.seNotes}</p>
            ) : null}
            <Textarea
              className="mt-3"
              onChange={(e) => setFeedback((current) => ({ ...current, [request.id]: e.target.value }))}
              placeholder="Mentor feedback and next steps…"
              value={feedback[request.id] ?? ""}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="mt-0" onClick={() => void complete(request.id, "approve")} size="sm">
                Approve step
              </Button>
              <Button onClick={() => void complete(request.id, "reject")} size="sm" variant="outline">
                Needs revision
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
