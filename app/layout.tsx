import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abroad Application Hub",
  description: "Organize international program and scholarship applications with your own official sources.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#315C4B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink selection:bg-sage selection:text-ink">
        {children}
      </body>
    </html>
  );
}
