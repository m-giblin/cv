import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import { ForgeSdkLoader } from "@/components/forge/forge-sdk-loader";
import { Providers } from "@/components/providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
 subsets: ["latin"],
 display: "swap",
 axes: ["opsz", "wdth"],
 variable: "--font-bricolage",
});

const instrumentSerif = Instrument_Serif({
 subsets: ["latin"],
 display: "swap",
 weight: "400",
 style: "italic",
 variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
 title: "SE Enablement",
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
 className={`${bricolage.variable} ${instrumentSerif.variable} font-[family-name:var(--font-bricolage)] antialiased`}
 >
 <ForgeSdkLoader />
 <Providers>{children}</Providers>
 </body>
 </html>
 );
}
