import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="bg-app h-screen-safe overflow-hidden">{children}</body>
    </html>
  );
}
