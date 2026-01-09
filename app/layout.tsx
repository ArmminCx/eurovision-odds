import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from 'react-hot-toast'; // IMPORT THIS

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
          {children}
          {/* THE TOAST CONTAINER - Style it to match your glass theme */}
          <Toaster 
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
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