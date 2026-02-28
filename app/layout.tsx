import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { NotificationToast } from "@/components/NotificationToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gull",
  description: "Global Shopping Proxy Platform",
};

import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen pb-20 lg:pb-0`}
      >
        <LanguageProvider>
          <NotificationProvider>
            {/* Desktop sidebar offset + responsive main content */}
            <div className="lg:pl-64 min-h-screen transition-all duration-300">
              <main className="max-w-md mx-auto min-h-screen relative bg-background border-x border-border shadow-2xl lg:max-w-none lg:border-none lg:shadow-none">
                <div className="lg:max-w-6xl lg:mx-auto">
                  {children}
                </div>
                <BottomNav />
              </main>
            </div>
            <NotificationToast />
          </NotificationProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
