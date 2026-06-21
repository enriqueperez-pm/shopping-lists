import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const roboto = Roboto({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Administración",
  description: "Despensa, presupuesto y gastos del hogar en un solo lugar",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A2238",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${inter.variable} ${roboto.variable} ${playfair.variable}`}>
      <body className="bg-app h-screen-safe overflow-hidden font-sans">{children}</body>
    </html>
  );
}
