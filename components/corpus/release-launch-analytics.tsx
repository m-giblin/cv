"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminTable, EmptyState, LoadingState, Meta, SectionHeading, Td, Th } from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";

type LaunchRow = {
  id: string;
  name: string;
  project_tag: string;
  enrolled: number;
  started: number;
  completed: number;
};

export function ReleaseLaunchAnalytics() {
  const [rows, setRows] = useState<LaunchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/release-courses/analytics");
    if (response.ok) {
      const body = (await response.json()) as { launches: LaunchRow[] };
      setRows(body.launches ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading meta="Enrolled, started and completed" title="Release launch analytics" />
      {loading ? (
        <div className="rounded-[14px] border border-line bg-white">
          <LoadingState label="Loading launches…" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-white">
          <EmptyState>No release courses yet.</EmptyState>
        </div>
      ) : (
        <AdminTable caption="Release course adoption" minWidth={600}>
          <thead>
            <tr>
              <Th>Course</Th>
              <Th>Tag</Th>
              <Th className="text-right">Enrolled</Th>
              <Th className="text-right">Started</Th>
              <Th className="text-right">Completed</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td className="font-bold">{row.name}</Td>
                <Td>
                  <Tag tone="blue">{row.project_tag}</Tag>
                </Td>
                <Td className="text-right">
                  <Meta className="text-ink">{row.enrolled}</Meta>
                </Td>
                <Td className="text-right">
                  <Meta className="text-ink">{row.started}</Meta>
                </Td>
                <Td className="text-right">
                  <Meta className="text-ink">{row.completed}</Meta>
                </Td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
