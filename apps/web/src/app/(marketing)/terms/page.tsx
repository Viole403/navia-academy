import type { Metadata } from "next"
import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 2026">
      <section>
        <h2>1. About Navia</h2>
        <p>
          Navia is an educational platform for learning Chinese, German,
          Japanese, and English. This project is offered as-is, as a study tool,
          without guarantee of continuous availability.
        </p>
      </section>
      <section>
        <h2>2. Your Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          credentials and for the activity carried out with your account. You
          can delete your account and your data at any time from Settings.
        </p>
      </section>
      <section>
        <h2>3. Acceptable Use</h2>
        <ul>
          <li>
            Do not attempt to access other users&apos; data or administrative
            areas without authorization.
          </li>
          <li>
            Do not use the platform to distribute illicit or harmful content.
          </li>
          <li>
            Do not reverse engineer for malicious purposes or attack the
            infrastructure.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Educational Content</h2>
        <p>
          The educational content (vocabulary, grammar, readings, characters,
          conversations) is produced with rigor, but may contain errors. The
          results of assessments and automatic corrections are indicative and do
          not constitute an official certification. Exam names (HSK, TOCFL,
          Goethe, JLPT, TOEFL) are trademarks of their holders; this platform is
          not affiliated with the official exams.
        </p>
      </section>
      <section>
        <h2>5. Intellectual Property</h2>
        <p>
          The project code is published under the MIT license. Third-party
          resources (icons, fonts, open linguistic data) retain their original
          licenses, credited in the repository.
        </p>
      </section>
      <section>
        <h2>6. Changes</h2>
        <p>
          These terms may be updated. Relevant changes will be communicated
          through the application itself.
        </p>
      </section>
    </LegalPage>
  )
}
