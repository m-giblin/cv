import { describe, expect, it } from "vitest";
import { parseCsvRows, readPeopleCsv } from "@/lib/admin/people-csv";

const allowSailPoint = (email: string) => (email.endsWith("@sailpoint.com") ? null : "Only @sailpoint.com addresses");

describe("parseCsvRows", () => {
  it("keeps commas inside quoted cells and doubled quotes", () => {
    expect(parseCsvRows('a,b\n"Smith, Alex","say ""hi"""\n')).toEqual([
      ["a", "b"],
      ["Smith, Alex", 'say "hi"'],
    ]);
  });
  it("handles Windows line endings and skips blank lines", () => {
    expect(parseCsvRows("a,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("readPeopleCsv", () => {
  it("reads rows, defaults role and level, and accepts header variations", () => {
    const rows = readPeopleCsv("Full Name,Email,Role,Level,Manager Email\nJordan Reyes,Jordan@SailPoint.com,,,boss@sailpoint.com\n", allowSailPoint);
    expect(rows[0]).toMatchObject({ fullName: "Jordan Reyes", email: "jordan@sailpoint.com", role: "basic_se", level: "Basic", managerEmail: "boss@sailpoint.com", problem: null });
  });
  it("flags bad rows with a reason", () => {
    const rows = readPeopleCsv(
      "fullName,email,role,level\nA,a@sailpoint.com,wizard,Basic\nBob B,bob@gmail.com,basic_se,Basic\nCat C,cat@sailpoint.com,basic_se,Expert\nDan D,dan@sailpoint.com,,\nDan D,dan@sailpoint.com,,\n",
      allowSailPoint,
    );
    expect(rows.map((row) => row.problem)).toEqual([
      "Missing name",
      "Only @sailpoint.com addresses",
      'Unknown level "Expert"',
      null,
      "Listed twice in this file",
    ]);
  });
});
