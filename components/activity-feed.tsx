import { formatDistanceToNow } from "date-fns";
import { ActivityLog, Profile } from "@/lib/types";

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
    <div className="space-y-4">
      {sorted.map((item) => {
        const person = profiles.find((profile) => profile.id === item.userId);

        return (
          <div className="relative border-l border-slate-200 pl-4" key={item.id}>
            <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {person?.fullName ?? "Unknown SE"} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
