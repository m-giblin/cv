import type { ProfileRole, SeLevel } from "@/lib/types";

/** People CSV: the template, a reader that handles quoted cells, and row checks (safe for the browser). */

export const PEOPLE_CSV_COLUMNS = ["fullName", "email", "role", "level", "managerEmail"] as const;

export const PEOPLE_CSV_TEMPLATE = [
  PEOPLE_CSV_COLUMNS.join(","),
  "Jordan Reyes,jordan.reyes@sailpoint.com,basic_se,Basic,manager.name@sailpoint.com",
  '"Smith, Alex",alex.smith@sailpoint.com,senior_se,Senior,manager.name@sailpoint.com',
].join("\n");

export const IMPORTABLE_ROLES: ProfileRole[] = [
  "basic_se",
  "senior_se",
  "advisory_solutions_consultant",
  "mentor",
  "manager",
  "director",
  "admin",
];

export const SE_LEVELS: SeLevel[] = ["Basic", "Senior", "Advisory"];

/** Splits CSV text into rows of cells, honouring "quoted, cells" and doubled "" quotes. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

export type PeopleCsvRow = {
  line: number;
  fullName: string;
  email: string;
  role: ProfileRole;
  level: SeLevel;
  managerEmail: string;
  /** Why the row can't be imported, if it can't. */
  problem: string | null;
};

const HEADER_ALIASES: Record<string, (typeof PEOPLE_CSV_COLUMNS)[number]> = {
  fullname: "fullName",
  full_name: "fullName",
  name: "fullName",
  email: "email",
  role: "role",
  level: "level",
  manageremail: "managerEmail",
  manager_email: "managerEmail",
  manager: "managerEmail",
};

/** Reads the file into checked rows. Role and level fall back to Basic SE when blank. */
export function readPeopleCsv(text: string, isAllowedEmail: (email: string) => string | null): PeopleCsvRow[] {
  const [header = [], ...body] = parseCsvRows(text.replace(/^﻿/, ""));
  const columns = header.map((name) => HEADER_ALIASES[name.toLowerCase().replace(/\s+/g, "")] ?? null);
  const seen = new Set<string>();
  return body.map((cells, index) => {
    const value = (key: (typeof PEOPLE_CSV_COLUMNS)[number]) => cells[columns.indexOf(key)]?.trim() ?? "";
    const email = value("email").toLowerCase();
    const roleText = value("role").toLowerCase().replace(/\s+/g, "_") || "basic_se";
    const levelText = value("level");
    const level = SE_LEVELS.find((item) => item.toLowerCase() === levelText.toLowerCase()) ?? "Basic";
    let problem: string | null = null;
    if (value("fullName").length < 2) problem = "Missing name";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem = "Missing or invalid email";
    else if (isAllowedEmail(email)) problem = isAllowedEmail(email);
    else if (!IMPORTABLE_ROLES.includes(roleText as ProfileRole)) problem = `Unknown role "${value("role")}"`;
    else if (levelText && !SE_LEVELS.some((item) => item.toLowerCase() === levelText.toLowerCase())) problem = `Unknown level "${levelText}"`;
    else if (seen.has(email)) problem = "Listed twice in this file";
    seen.add(email);
    return {
      line: index + 2,
      fullName: value("fullName"),
      email,
      role: (IMPORTABLE_ROLES.includes(roleText as ProfileRole) ? roleText : "basic_se") as ProfileRole,
      level,
      managerEmail: value("managerEmail").toLowerCase(),
      problem,
    };
  });
}

/** CSV-safe cell. */
export function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
