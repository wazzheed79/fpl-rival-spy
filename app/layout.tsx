
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FPL Rival Spy & Differential Radar",
  description: "Live Fantasy Premier League differential scout and mini-league rival tracker.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rival Spy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#38003c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0c0011] text-slate-100 selection:bg-[#00ff87] selection:text-[#120016]`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}