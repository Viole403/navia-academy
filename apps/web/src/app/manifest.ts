import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Navia",
    short_name: "Navia",
    description: "Learn languages with the structure of a private academy.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#b3382c",
    lang: "en",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
