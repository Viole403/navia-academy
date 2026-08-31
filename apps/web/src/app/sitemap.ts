import type { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://navia.academy"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/features`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/support`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contributors`, changeFrequency: "monthly", priority: 0.4 },
    {
      url: `${BASE}/contributors/apply`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
