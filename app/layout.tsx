import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { ForgeSdkLoader } from "@/components/forge/forge-sdk-loader";
import { Providers } from "@/components/providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
 subsets: ["latin"],
 display: "swap",
 variable: "--font-bricolage",
});

const geistMono = Geist_Mono({
 subsets: ["latin"],
 display: "swap",
 weight: ["400", "500"],
 variable: "--font-geist-mono",
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
 className={`${bricolage.variable} ${geistMono.variable} font-[family-name:var(--font-bricolage)] antialiased`}
 >
 <ForgeSdkLoader />
 <Providers>{children}</Providers>
 </body>
 </html>
 );
}
