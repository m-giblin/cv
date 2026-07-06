import { Inter, Poppins } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-ns-body" });
const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-ns-display" });

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${poppins.variable}`}>{children}</div>;
}
