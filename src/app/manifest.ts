import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hospital HMS",
    short_name: "HMS",
    description: "Hospital Management System — OPD, IPD, Pharmacy, Billing",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}