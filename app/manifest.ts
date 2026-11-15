import type { MetadataRoute } from "next";
import { PAGE_BACKGROUND } from "@/lib/brand/iconArt";

/** Web app manifest, so AbroadAtlas can be installed to a phone or desktop. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "AbroadAtlas",
    short_name: "AbroadAtlas",
    description: "Organize international program and scholarship applications with your own official sources.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: PAGE_BACKGROUND,
    theme_color: PAGE_BACKGROUND,
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add application", url: "/app/applications/new" },
      { name: "Deadlines", url: "/app/deadlines" },
      { name: "Documents", url: "/app/documents" },
    ],
  };
}
