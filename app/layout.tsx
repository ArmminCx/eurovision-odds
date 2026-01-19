import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from 'react-hot-toast';
import BroadcastListener from "./components/BroadcastListener";
import ActivityTicker from "./components/ActivityTicker";
import DailyRewardChecker from "./components/DailyRewardChecker"; // 👈 NEW IMPORT

export const metadata: Metadata = {
  title: "Eurovision Odds",
  description: "Community Prediction Market & Leaderboard",
  manifest: "/manifest.json",
  openGraph: {
    title: "Eurovision Odds",
    description: "Join the ultimate Eurovision prediction league.",
    url: "https://eurovision-odds.vercel.app",
    siteName: "Eurovision Odds",
    images: [{ url: "/logo.png", width: 800, height: 600 }],
    locale: "en_US",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ESC Odds",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0c29",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-white">
        <LanguageProvider>
          
          {/* --- GLOBAL LISTENERS (Run on every page) --- */}
          <BroadcastListener />
          <ActivityTicker />
          <DailyRewardChecker /> {/* 👈 CHECKS FOR DAILY LOGIN BONUS */}
          
          {/* --- MAIN CONTENT --- */}
          {children}
          
          {/* --- NOTIFICATIONS --- */}
          <Toaster 
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerStyle={{ top: 20 }}
            toastOptions={{
              duration: 3000,
              style: {
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                maxWidth: '400px',
              },
              success: {
                iconTheme: { primary: '#4ade80', secondary: 'black' },
                style: { border: '1px solid #4ade80' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: 'black' },
                style: { border: '1px solid #ef4444' }
              }
            }}
          />
        </LanguageProvider>
      </body>
    </html>
  );
}