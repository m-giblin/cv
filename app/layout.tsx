import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Syne } from "next/font/google";
import { ForgeSdkLoader } from "@/components/forge/forge-sdk-loader";
import { Providers } from "@/components/providers";
import "./globals.css";

const syne = Syne({
 subsets: ["latin"],
 display: "swap",
 weight: ["700", "800"],
 variable: "--font-syne",
});

const dmSans = DM_Sans({
 subsets: ["latin"],
 display: "swap",
 variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "500"],
 variable: "--font-dm-mono",
});

export const metadata: Metadata = {
 title: "Enablement Platform",
 description: "Internal onboarding, simulation, and enablement.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en">
 <body
 className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} font-[family-name:var(--font-dm-sans)] antialiased`}
 >
 <ForgeSdkLoader />
 <Providers>{children}</Providers>
 </body>
 </html>
 );
}
