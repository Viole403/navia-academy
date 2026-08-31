import type { Metadata } from "next"
import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = { title: "Cookie Policy" }

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="August 2026">
      <section>
        <h2>1. What We Use</h2>
        <p>
          Navia uses browser local storage (localStorage) and essential
          technical cookies to keep you logged in.
        </p>
      </section>
      <section>
        <h2>2. Technical Storage</h2>
        <ul>
          <li>
            <strong>navia-settings:</strong> your visual and study preferences
            (theme, daily goal…).
          </li>
          <li>
            <strong>Learning cache:</strong> lesson content and recent progress
            for offline functionality.
          </li>
          <li>
            <strong>Session token:</strong> authentication token for the
            duration of your session.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Third-Party Cookies</h2>
        <p>
          No advertising or third-party tracking cookies are loaded. Analytics,
          if activated, requires your prior consent.
        </p>
      </section>
      <section>
        <h2>4. How to Manage Them</h2>
        <p>
          You can clear local storage from your browser settings or log out to
          invalidate the authentication token. Clearing that storage removes
          locally cached progress.
        </p>
      </section>
    </LegalPage>
  )
}
