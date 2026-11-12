import { ImageResponse } from "next/og";

/**
 * The app icon: a gold shield with a tick on brand green, drawn from shapes so no
 * image file is needed. Padded so it survives being cropped to a circle.
 */
export function appIcon(size: number) {
  const shield = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #3a3a3c 0%, #1b1b1d 100%)",
        }}
      >
        <svg width={shield} height={shield} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z"
            fill="#cfb284"
          />
          <path d="M8 12l3 3 5-6" stroke="#1b1b1d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
