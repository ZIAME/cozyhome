import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Afra's Home",
    short_name: "Afra's Home",
    description: "A cozy room for deen, journaling, creative work and planning.",
    start_url: "/",
    display: "standalone",
    background_color: "#EFE9DF",
    theme_color: "#3A2316",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
