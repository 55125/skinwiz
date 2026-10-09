import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/brand";

// Makes the site installable ("Add to Home Screen"): opens full screen from
// an icon, no app store. Launches land on My regimen, the page people come
// back to daily; utm_source lets the admin stats count home-screen launches.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Your skincare shelf, regimen and avoid list, matched by active ingredient.",
    start_url: "/regimen?utm_source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#efeee9",
    theme_color: "#006761",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My shelf", url: "/shelf?utm_source=homescreen" },
      { name: "Search products", url: "/search?utm_source=homescreen" },
    ],
  };
}
