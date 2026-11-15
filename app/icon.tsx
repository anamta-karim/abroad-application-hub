import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand/iconArt";

const SIZES = { favicon: 32, "192": 192, "512": 512 } as const;
type IconId = keyof typeof SIZES;

/** Favicon plus the 192/512 px app icons (served at /icon/<id>). */
export function generateImageMetadata() {
  return (Object.keys(SIZES) as IconId[]).map((id) => ({
    id,
    size: { width: SIZES[id], height: SIZES[id] },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const key = (await id) as IconId;
  const size = SIZES[key] ?? 512;
  return new ImageResponse(iconArt(size, key === "favicon"), { width: size, height: size });
}
