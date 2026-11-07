import type { Metadata } from "next";
import Link from "next/link";
import {
  contentReportMailto,
  operatorEmail,
  operatorMailto,
  operatorName,
} from "@/lib/legal-contact";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="legal-document">
      <h1>Terms of Service</h1>
      <p className="legal-date">
        Updated <time dateTime="2026-11-07">7 November 2026</time>
      </p>
      <p>
        GlobeAlbum is a free travel album service operated by {operatorName}, an
        individual based in Slovakia. You can reach the operator at{" "}
        <a href={operatorMailto}>{operatorEmail}</a>.
      </p>

      <h2>Your account</h2>
      <p>
        You agree to these terms when you create an account. You must be able to
        enter this agreement under the law that applies to you. Keep your
        sign-in details secure and let us know if you suspect someone else is
        using your account.
      </p>

      <h2>Your photos and places</h2>
      <p>
        You keep the rights you have in what you upload. You give us permission
        to store, resize and display it as needed to operate your globe and to
        share it when you choose to publish. That permission ends when you
        remove the content or delete your account, subject to the time needed
        for cleanup and any legal obligations.
      </p>
      <p>
        Upload only content you are allowed to use and share. Respect copyright,
        privacy and the rights of people shown in your photos. You can keep your
        globe private or publish it at your profile address. Anyone with the
        public link can view it. Keep copies of the photos that matter to you.
        GlobeAlbum stores processed versions for the album.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not upload illegal material, share someone’s private information
        without authority, harass others, impersonate someone, distribute
        malicious files, or bypass access controls or storage limits. We may
        restrict specific content or an account when needed to enforce these
        terms, protect people or the service, or comply with the law. We will
        explain the reason and how to contact us to challenge the decision where
        the law requires this and allows us to do so.
      </p>

      <h2 id="report-content">Report content</h2>
      <p>
        <a href={contentReportMailto}>Email a content report</a> if you believe
        something hosted on GlobeAlbum is illegal or breaks these terms. Include
        the exact page or content URL, describe the content and why you are
        reporting it, and confirm that you believe the information is accurate
        and complete. Include your name and contact email unless the law allows
        an anonymous report. We review reports and respond where we have a
        contact address.
      </p>

      <h2>Deleting your account</h2>
      <p>
        You can stop using GlobeAlbum at any time. To delete your account, open{" "}
        <Link href="/settings">Profile settings</Link> and confirm deletion with
        your username. The <Link href="/privacy">Privacy Policy</Link> explains
        what happens to your data and copies after deletion.
      </p>

      <h2>Service changes and legal rights</h2>
      <p>
        GlobeAlbum may change as it develops, and features can be temporarily
        unavailable. We will post updates here and give notice of material
        changes where required. These terms preserve your mandatory consumer and
        other legal rights.
      </p>
    </article>
  );
}
