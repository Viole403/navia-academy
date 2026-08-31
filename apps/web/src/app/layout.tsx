import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import {
  Inter,
  Plus_Jakarta_Sans,
  Noto_Sans_SC,
  Noto_Sans_TC,
  Noto_Sans_JP,
} from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { PwaRegister } from "@/components/common/pwa-register"
import { AuthProvider } from "@/lib/auth-context"
import { DataSyncProvider } from "@/components/providers/data-sync-provider"
import { LocaleProvider } from "@/i18n/locale-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-var",
  display: "swap",
})

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display-var",
  display: "swap",
})

// Older surfaces still reference --font-serif-var (card crossheads etc).
// It now resolves to the same geometric sans — no stray serif anywhere.
const serifFallback = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-serif-var",
  display: "swap",
})

const hanziSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-hanzi-sc",
  display: "swap",
})
const hanziTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-hanzi-tc",
  display: "swap",
})
const hanziJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-hanzi-jp",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Navia — Language Academy",
    template: "%s · Navia",
  },
  description:
    "Learn a language the way the exam expects it. Exam-aligned itineraries, adaptive placement, spaced repetition, and a pronunciation lab that checks your tone.",
  keywords: [
    "learn languages",
    "language academy",
    "HSK",
    "TOCFL",
    "JLPT",
    "TOEFL",
    "CEFR",
    "spaced repetition",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Navia",
    title: "Navia — Language Academy",
    description:
      "From zero to exam-ready: adaptive placement, exam-aligned itineraries, spaced repetition, tone-checked pronunciation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Navia",
    description: "Language academy, from zero to exam-ready.",
  },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#f4f4f1",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieLocale = (await cookies()).get("navia-locale")?.value
  const initialLocale: "en" | "id" = cookieLocale === "id" ? "id" : "en"
  return (
    <html
      lang="en"
      data-theme="bauhaus"
      data-fontsize="md"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${display.variable} ${serifFallback.variable} ${hanziSC.variable} ${hanziTC.variable} ${hanziJP.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <DataSyncProvider>
              <LocaleProvider initialLocale={initialLocale}>
                {children}
              </LocaleProvider>
            </DataSyncProvider>
          </AuthProvider>
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
