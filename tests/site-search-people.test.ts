import { describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const ASSIGNMENTS: Row[] = [
  { id: "a-own", user_id: "me", mentor_id: "matt", status: "in_progress" },
  { id: "a-mentee", user_id: "riley", mentor_id: "me", status: "in_progress" },
  { id: "a-done", user_id: "sam", mentor_id: "me", status: "completed" },
];
const PROFILES: Row[] = [
  { id: "me", full_name: "Jordan Lee", role: "basic_se", email: "jordan@x.test", manager_id: "dana", tenant_id: "t1", status: "active" },
  { id: "matt", full_name: "Matt Giblin", role: "super_admin", email: "matt@x.test", manager_id: null, tenant_id: "home", home_tenant_id: "t1", status: "active" },
  { id: "dana", full_name: "Dana Cruz", role: "manager", email: "dana@x.test", manager_id: null, tenant_id: "t1", status: "active" },
  { id: "riley", full_name: "Riley Park", role: "basic_se", email: "riley@x.test", manager_id: "dana", tenant_id: "t1", status: "active" },
  { id: "sam", full_name: "Sam Ortiz", role: "basic_se", email: "sam@x.test", manager_id: "dana", tenant_id: "t1", status: "active" },
  { id: "pat", full_name: "Pat Other", role: "basic_se", email: "pat@x.test", manager_id: "me", tenant_id: "t2", status: "active" },
];

/** Just enough of the query builder for the people loader: or("a.eq.x,b.eq.y") and in("id", ids). */
function table(rows: Row[]) {
  let current = rows;
  const builder = {
    select: () => builder,
    or: (filter: string) => {
      const clauses = filter.split(",").map((clause) => clause.split(".eq."));
      current = current.filter((row) => clauses.some(([column, value]) => row[column!] === value));
      return builder;
    },
    in: (column: string, values: string[]) => {
      current = current.filter((row) => values.includes(row[column] as string));
      return builder;
    },
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data: current, error: null }),
  };
  return builder;
}

vi.mock("@/lib/data/tenant-scoped-query", () => ({
  getTenantAdminClient: () => ({ from: (name: string) => table(name === "plan_assignments" ? ASSIGNMENTS : PROFILES) }),
}));

const { loadPeopleYouWorkWith, rankPeople } = await import("@/lib/search/site-search");

describe("people search", () => {
  it("finds the viewer's manager, mentor and active mentees, in their tenant only", async () => {
    const people = await loadPeopleYouWorkWith({ userId: "me", tenantId: "t1" });
    const byId = Object.fromEntries(people.map((person) => [person.id, person.relations]));
    expect(byId).toEqual({ dana: ["manager"], matt: ["mentor"], riley: ["mentee"] });
  });

  it("shows name and relation, and links somewhere that exists", async () => {
    const people = await loadPeopleYouWorkWith({ userId: "me", tenantId: "t1" });
    expect(rankPeople("matt", people, false)).toEqual([
      { id: "matt", title: "Matt Giblin", detail: "Your mentor, Admin", href: "mailto:matt@x.test", external: false },
    ]);
    expect(rankPeople("riley", people, false)[0]!.href).toBe("/mentoring?open=a-mentee");
    expect(rankPeople("mentor", people, false).map((result) => result.id)).toEqual(["matt"]);
  });

  it("sends a manager to the roster card for a report", () => {
    const report = { id: "riley", name: "Riley Park", role: "basic_se" as const, email: "riley@x.test", relations: ["report" as const] };
    expect(rankPeople("riley", [report], true)[0]!.href).toBe("/manager/team?profile=riley");
    expect(rankPeople("riley", [report], false)[0]!.href).toBe("mailto:riley@x.test");
  });
});
