import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.appName,
    short_name: appConfig.appName,
    description: "A family and business ledger for one shared bank account.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f0ea",
    theme_color: "#16213a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
