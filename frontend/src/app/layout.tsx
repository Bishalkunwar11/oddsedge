import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OddsEdge",
  description:
    "Real-time football odds analysis, arbitrage detection, and value bet scanning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full dark", inter.variable, spaceGrotesk.variable)}>
      <body className="h-full antialiased text-foreground bg-background">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
