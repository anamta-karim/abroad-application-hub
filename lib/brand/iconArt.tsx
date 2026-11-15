/**
 * The AbroadAtlas mark (white "A" on the brand gradient) for generated icons.
 * `rounded` adds corners for favicons; app icons stay full-bleed so the OS
 * can apply its own mask (the letter sits well inside the maskable safe zone).
 */
export const BRAND_FROM = "#3E72A6";
export const BRAND_TO = "#265582";
export const PAGE_BACKGROUND = "#EAF1F8";

export function iconArt(size: number, rounded = false) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
        color: "white",
        fontSize: Math.round(size * 0.56),
        fontWeight: 800,
        lineHeight: 1,
        fontFamily: "sans-serif",
      }}
    >
      A
    </div>
  );
}
