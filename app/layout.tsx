import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";

export const metadata: Metadata = {
  title: "Eurovision Odds",
  description: "Community Prediction Market",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}