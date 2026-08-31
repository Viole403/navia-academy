import type { Metadata } from "next"
import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <section>
        <h2>1. What Data We Process</h2>
        <ul>
          <li>
            <strong>Account:</strong> email and a securely hashed password,
            handled by the platform&#39;s authentication service.
          </li>
          <li>
            <strong>Learning:</strong> lesson progress, reviews, exercise
            results, placement results, and study preferences.
          </li>
          <li>
            <strong>Technical:</strong> those strictly necessary for session
            operation.
          </li>
        </ul>
      </section>
      <section>
        <h2>2. How We Use Them</h2>
        <p>
          Exclusively to provide the service: personalize your itinerary,
          calculate your reviews, and show you your progress. We do not sell
          data or share it with third parties for advertising purposes.
        </p>
      </section>
      <section>
        <h2>3. Where They Are Stored</h2>
        <p>
          Account and learning data live in our own PostgreSQL database,
          protected so other users cannot access your data. Content is served
          from a read-only CDN. Some preferences are also kept in your browser
          for offline use.
        </p>
      </section>
      <section>
        <h2>4. Your Rights</h2>
        <ul>
          <li>Export your data from Settings when available.</li>
          <li>Delete your account and all associated data from Settings.</li>
          <li>Modify your profile data at any time.</li>
        </ul>
      </section>
      <section>
        <h2>5. Analytics</h2>
        <p>
          Analytics is optional and respects your consent. Without explicit
          consent, no usage tracking is activated.
        </p>
      </section>
      <section>
        <h2>6. Contact</h2>
        <p>For any privacy questions, use the contact page.</p>
      </section>
    </LegalPage>
  )
}
