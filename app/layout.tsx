import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abroad Application Hub",
  description: "Organize international program and scholarship applications with your own official sources.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EAF1F8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-ink antialiased relative">
        {/* Luminous Ambient Light Layer (Rich Aurora Blobs for Glass Refraction) */}
        <div className="ambient-glow-layer" aria-hidden="true">
          <div className="aurora-blob aurora-blob-blue" />
          <div className="aurora-blob aurora-blob-lavender" />
          <div className="aurora-blob aurora-blob-rose" />
          <div className="aurora-blob aurora-blob-cyan" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 page-transition min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
