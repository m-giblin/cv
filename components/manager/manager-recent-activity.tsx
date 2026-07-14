"use client";

import { formatDistanceToNow } from "date-fns";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { ActivityLog, Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

function activityVerb(item: ActivityLog) {
  if (item.metadata.decision === "reject" || item.metadata.validation_status === "rejected") {
    return "had work sent back for revision";
  }
  if (item.metadata.decision === "approve" || item.metadata.validation_status === "reviewed") {
    return "received manager approval";
  }
  if (item.metadata.validation_status === "submitted") {
    return "submitted for review";
  }
  return item.title.toLowerCase();
}

export function ManagerRecentActivity({
  activity,
  profiles,
  limit = 6,
}: {
  activity: ActivityLog[];
  profiles: Profile[];
  limit?: number;
}) {
  const sorted = [...activity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <div className="border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
          <span className="font-display text-[13px] font-bold text-[#0D0E12]">Recent activity</span>
        </div>
        <p className="px-4 py-8 text-center text-[11.5px] text-[#A09D98]">No team activity yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-[#E2DFD9] bg-white">
      <div className="border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
        <span className="font-display text-[13px] font-bold text-[#0D0E12]">Recent activity</span>
      </div>
      {sorted.map((item) => {
        const person = profiles.find((profile) => profile.id === item.userId);
        const name = person?.fullName ?? "Team member";
        return (
          <div
            className="flex items-start gap-[9px] border-b border-[#F2F0EC] px-[14px] py-[9px] last:border-b-0"
            key={item.id}
          >
            <div
              className="mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-[8.5px] font-medium text-white"
              style={{ background: avatarGradientForId(item.userId) }}
            >
              {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] leading-snug text-[#0D0E12]">
                <strong className="font-semibold">{name.split(" ")[0]}</strong>{" "}
                <span className="text-[#6B6860]">{activityVerb(item)}</span>
              </p>
              <p className="mt-0.5 font-mono text-[8.5px] text-[#A09D98]">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
