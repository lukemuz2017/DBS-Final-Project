import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Runway",
  description: "A 12-week cash forecast for people whose income is lumpy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
