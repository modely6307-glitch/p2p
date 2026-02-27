import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WishEscrow",
  description: "P2P Wishlist/Escrow Platform",
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen pb-20`}
      >
        <LanguageProvider>
          <main className="max-w-md mx-auto min-h-screen relative bg-background border-x border-border shadow-2xl">
            {children}
            <BottomNav />
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
