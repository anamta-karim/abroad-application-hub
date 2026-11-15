import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand/iconArt";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone and iPad (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(iconArt(180), size);
}
