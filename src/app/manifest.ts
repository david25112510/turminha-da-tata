import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Turminha da Tata",
    short_name: "Turminha da Tata",
    description: "Sistema de gestão e acompanhamento da Turminha da Tata",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF2",
    theme_color: "#1FA787",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
