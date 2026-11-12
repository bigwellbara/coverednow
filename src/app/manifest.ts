import type { MetadataRoute } from "next";

/** Lets people add CoveredNow to their phone's home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoveredNow",
    short_name: "CoveredNow",
    description: "School-confirmed fee bills in Zimbabwe, paid straight to the school.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#1d1d1f",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Browse bills", url: "/browse" },
      { name: "My giving", url: "/giving" },
      { name: "Leaderboard", url: "/leaderboard" },
    ],
  };
}
