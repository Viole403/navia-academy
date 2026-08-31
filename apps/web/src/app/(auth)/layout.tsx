import { cookies } from "next/headers"
import { SiteHeader } from "@/components/common/site-header"
import { SiteFooter } from "@/components/common/site-footer"
import { LocaleProvider, type Locale } from "@/i18n/locale-context"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get("navia-locale")?.value
  const initialLocale: Locale | undefined =
    raw === "en" || raw === "id" ? raw : undefined
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <SiteHeader hideAuthButtons />
      {children}
      <SiteFooter />
    </LocaleProvider>
  )
}
