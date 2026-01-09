import type { Metadata, Viewport } from "next"; // Added Viewport
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";

export const metadata: Metadata = {
  title: "Eurovision Odds",
  description: "Community Prediction Market & Leaderboard",
  manifest: "/manifest.json", // LINKED THE APP FILE
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

// New Next.js way to handle mobile scaling
export const viewport: Viewport = {
  themeColor: "#0f0c29",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents annoying zooming on buttons
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
        </LanguageProvider>
      </body>
    </html>
  );
}