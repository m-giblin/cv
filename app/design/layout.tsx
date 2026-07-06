import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { DesignShell } from "@/components/design/design-shell";
import "./design.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-design-body",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-design-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-design-mono",
});

export const metadata: Metadata = {
  title: "Design Lab — SE Enablement",
  description: "Visual design explorations — not production UI.",
  robots: "noindex, nofollow",
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${ibmPlex.variable} ${jetbrains.variable} font-[family-name:var(--font-design-body)]`}
    >
      <DesignShell>{children}</DesignShell>
    </div>
  );
}
