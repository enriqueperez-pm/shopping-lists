import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lista de compras",
  description: "Tu despensa y lista del super, siempre a la mano",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Despensa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="bg-app h-screen-safe overflow-hidden">{children}</body>
    </html>
  );
}
