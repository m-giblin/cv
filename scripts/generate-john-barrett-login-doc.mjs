#!/usr/bin/env node
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  AlignmentType,
  ShadingType,
} from "docx";

const PORTAL_URL = "https://se-enablement-platform.vercel.app/login";

const teamRows = [
  ["John Barrett", "john.barrett@sailpoint.com", "DemoMgr2026!", "Manager", "Senior", "Reports to Matt Giblin"],
  ["Avery Brooks", "avery.brooks@example.com", "DemoSE2026!", "Senior SE", "Senior", "Promoted + advanced plans"],
  ["Blake Chen", "blake.chen@example.com", "DemoSE2026!", "Senior SE", "Senior", "Promoted + advanced plans"],
  ["Caleb Diaz", "caleb.diaz@example.com", "DemoSE2026!", "Advisory SC", "Advisory", "Promoted + advanced plans"],
  ["Dana Evans", "dana.evans@example.com", "DemoSE2026!", "Basic SE", "Basic", "Unchanged"],
  ["Ellis Foster", "ellis.foster@example.com", "DemoSE2026!", "Basic SE", "Basic", "Unchanged"],
  ["Morgan Lee", "morgan.lee@example.com", "DemoSE2026!", "Basic SE", "Basic", "New hire + onboarding plans"],
  ["Quinn Martin", "quinn.martin@example.com", "DemoSE2026!", "Basic SE", "Basic", "New hire + onboarding plans"],
];

const headers = ["Name", "Email (login)", "Password", "Role", "Level", "Notes"];

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header
      ? { fill: "00143A", type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    children: [
      new Paragraph({
        alignment: opts.header ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: Boolean(opts.header),
            color: opts.header ? "FFFFFF" : undefined,
            size: opts.header ? 20 : 18,
          }),
        ],
      }),
    ],
  });
}

const table = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      children: headers.map((h, i) =>
        cell(h, { header: true, width: i === 0 ? 14 : i === 1 ? 22 : i === 2 ? 12 : i === 5 ? 20 : 10 }),
      ),
    }),
    ...teamRows.map(
      (row) =>
        new TableRow({
          children: row.map((value) => cell(value)),
        }),
    ),
  ],
});

const doc = new Document({
  title: "John Barrett — SE Enablement Portal Login Guide",
  creator: "SE Enablement Platform",
  description: "First-time login, MFA setup, and team credential grid for John Barrett.",
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: "SE Enablement Portal", bold: true })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "John Barrett — Login & MFA Setup Guide",
              bold: true,
              size: 28,
              color: "0071CE",
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
              italics: true,
              color: "64748B",
            }),
          ],
          spacing: { after: 400 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("How John Logs In and Sets Up MFA")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "John Barrett is a Manager in the SE Enablement Platform. His profile was provisioned in Supabase; use the credentials below for first-time access. After password sign-in, the portal requires TOTP multi-factor authentication (MFA) before granting access to the Manager Command Center.",
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("First-time login (production)")],
        }),
        new Paragraph({
          children: [new TextRun({ text: "1. ", bold: true }), new TextRun(`Open ${PORTAL_URL}`)],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "2. ", bold: true }),
            new TextRun(
              "Sign in with email and password (use SSO only if NEXT_PUBLIC_SSO_DOMAIN is configured in Vercel):",
            ),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "   Email: ", bold: true }),
            new TextRun("john.barrett@sailpoint.com"),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "   Password: ", bold: true }),
            new TextRun("DemoMgr2026!"),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "3. ", bold: true }),
            new TextRun("After password sign-in, you are redirected to MFA enrollment (/auth/mfa/enroll)."),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "4. ", bold: true }),
            new TextRun(
              "On the MFA screen: scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy, etc.), then enter the 6-digit verification code.",
            ),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "5. ", bold: true }),
            new TextRun("You land on /manager — the Manager Command Center."),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Every login after that")],
        }),
        new Paragraph({
          children: [
            new TextRun("Password sign-in → enter 6-digit MFA code at /auth/mfa/verify → Manager dashboard."),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Forgot password")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              'Use "Forgot password" on the login page. A reset link is emailed via Supabase (production redirect URLs must include https://se-enablement-platform.vercel.app/auth/reset-password).',
            ),
          ],
          spacing: { after: 400 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Login Grid — John Barrett's Team")],
        }),
        new Paragraph({
          children: [
            new TextRun(
              "All demo SEs reporting to John use the same password. Each account completes MFA enrollment on first login, same as John.",
            ),
          ],
          spacing: { after: 200 },
        }),
        table,
        new Paragraph({
          children: [new TextRun({ text: "7 direct reports", italics: true, color: "64748B" })],
          spacing: { before: 200, after: 400 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Re-run seeds (developers)")],
        }),
        new Paragraph({
          children: [new TextRun("npm run seed:john-manager   — John's auth + manager profile")],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun("npm run seed:john-roster    — Team roles + onboarding plan assignments")],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun("npm run seed:demo           — Recreate all @example.com demo SEs")],
        }),
      ],
    },
  ],
});

const outputPath = resolve(process.cwd(), "docs/John-Barrett-Login-Guide.docx");
const buffer = await Packer.toBuffer(doc);
writeFileSync(outputPath, buffer);
console.log(`Wrote ${outputPath}`);
