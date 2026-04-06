import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FDHC DMS — Factory Direct Homes Center",
  description: "Factory Direct Homes Center - Dealer Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="h-full bg-slate-50 text-slate-900 antialiased font-sans">{children}</body>
    </html>
  );
}
