import type { Metadata, Viewport } from "next";
import React from "react";
import { MISSIONS_WORD } from "@/lib/gameConfig";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Retro display face for the arcade screen only. Exposed as a CSS variable and
// applied via .font-pixel so the non-gameplay screens keep Geist.
const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Build Bharat AI City",
  description: `Build ${MISSIONS_WORD.toLowerCase()} AI startups and transform Bharat AI City. An arcade mini-game from the Bharat AI Summit.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B1120",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
    >
      <body className="min-h-full h-full flex flex-col overflow-hidden bg-[#0f0f17]">
        {children}
        <div className="rotate-notice" role="alert">
          <div style={{ fontSize: 28 }} aria-hidden>
            &#8635;
          </div>
          <div>ROTATE YOUR PHONE</div>
          <div style={{ color: "#9a9ab5", fontSize: 8 }}>
            BHARAT AI CITY IS PLAYED
            <br />
            IN PORTRAIT
          </div>
        </div>
      </body>
    </html>
  );
}
