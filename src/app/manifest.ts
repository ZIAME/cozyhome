import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cozy Home",
    short_name: "Cozy Home",
    description: "A cozy room that keeps track of the parts of your life.",
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
