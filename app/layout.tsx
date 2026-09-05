import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Shams Orders",
  description: "إدارة وتوزيع أوردرات شمس",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/shams-icon-192.png" },
  appleWebApp: { capable: true, title: "Shams Orders", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ef7200", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" className={cairo.variable}><body>{children}</body></html>;
}
