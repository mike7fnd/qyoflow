import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/toast";
import "./globals.css";

// Variable Inter, self-hosted by next/font — no network request at runtime and
// no layout shift. One family across the whole product.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "QyoFlow — a waiting line nobody has to stand in",
    template: "%s · QyoFlow",
  },
  description:
    "Customers join your queue from their phone, watch their position move in real time, and get a notification when it's their turn.",
  openGraph: {
    title: "QyoFlow",
    description: "A waiting line nobody has to stand in.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
