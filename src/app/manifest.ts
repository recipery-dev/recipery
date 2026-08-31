import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recipery",
    short_name: "Recipery",
    description: "Your self-hosted recipe library.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#b01607",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
