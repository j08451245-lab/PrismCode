import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ScrollProgress } from "@/components/scroll-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrismCode — Terminal AI Coding Agent",
  description: "Open source AI agent that plans, codes, and ships from your terminal. 20+ models, MIT licensed.",
  openGraph: {
    title: "PrismCode",
    description: "Terminal AI coding agent. Open source, MIT licensed, self-hostable.",
    type: "website",
    url: "https://github.com/j08451245-lab/PrismCode",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrismCode",
    description: "Terminal AI coding agent. Open source, MIT licensed, self-hostable.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
