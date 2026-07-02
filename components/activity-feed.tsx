import { formatDistanceToNow } from "date-fns";
import { ActivityLog, Profile } from "@/lib/types";

function activityDetail(item: ActivityLog) {
  if (item.metadata.decision === "reject" || item.metadata.validation_status === "rejected") {
    return "Sent back for revision — SE must redo";
  }
  if (item.metadata.decision === "approve" || item.metadata.validation_status === "reviewed") {
    return "Approved by manager";
  }
  if (item.metadata.validation_status === "submitted") {
    return "Submitted for review";
  }
  return null;
}

export function ActivityFeed({
  activity,
  profiles,
}: {
  activity: ActivityLog[];
  profiles: Profile[];
}) {
  const sorted = [...activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-4 px-4 pb-4">
      {sorted.map((item) => {
        const person = profiles.find((profile) => profile.id === item.userId);
        const detail = activityDetail(item);

        return (
          <div className="relative border-l border-sp-blue/20 pl-4" key={item.id}>
            <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta ring-4 ring-sp-blue-soft" />
            <p className="text-sm font-bold text-sp-navy">{item.title}</p>
            {detail ? <p className="mt-0.5 text-xs font-medium text-sp-magenta">{detail}</p> : null}
            <p className="mt-1 text-xs text-sp-navy-muted">
              {person?.fullName ?? "Unknown SE"} •{" "}
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
