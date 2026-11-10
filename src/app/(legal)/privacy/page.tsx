import type { Metadata } from "next";
import Link from "next/link";
import {
  operatorEmail,
  operatorMailto,
  operatorName,
} from "@/lib/legal-contact";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="legal-document">
      <h1>Privacy Policy</h1>
      <p className="legal-date">
        Updated <time dateTime="2026-11-10">10 November 2026</time>
      </p>
      <p>
        {operatorName}, an individual based in Slovakia, operates GlobeAlbum and
        is responsible for the personal data described here. For privacy
        questions or requests, email{" "}
        <a href={operatorMailto}>{operatorEmail}</a>.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li>
          <strong>Account and sign-in.</strong> We use your name, email address,
          account ID, email verification status and sign-in session to create
          and secure your account. Neon Auth manages authentication, including
          password hashes for email accounts and provider identifiers and
          credentials for Google sign-in. Google can provide your profile name,
          email and photo URL when you choose Google sign-in. Your Google photo
          can appear in your own account menu, settings and studio. GlobeAlbum
          does not request access to your Gmail inbox.
        </li>
        <li>
          <strong>Your globe.</strong> We store your display name, profile
          address, style and visibility settings, saved places and coordinates,
          optional visit dates, photos, captions and an optional profile photo
          to show and share the album you create. Other members can include
          people in the photos and captions they upload. If someone has included
          you, you can contact us about that content.
        </li>
        <li>
          <strong>Operations and support.</strong> We use session and request
          information, which can include IP addresses, browser details,
          timestamps, request paths and error logs, to operate the service,
          diagnose errors and prevent abuse. When you contact us, we use the
          contact details and information you send to respond and resolve the
          request.
        </li>
        <li>
          <strong>Site analytics.</strong> We use Vercel Web Analytics to
          understand how often people visit the site and which pages they use.
          Vercel uses page views, referral information, approximate location and
          browser or device details to produce aggregate statistics. We remove
          query parameters, fragments and profile usernames from the page URLs
          sent in analytics events.
        </li>
      </ul>
      <p>
        We use data needed to open, operate and share your account to provide
        the service you request under our <Link href="/terms">terms</Link>. We
        rely on our legitimate interests in keeping the service secure and
        reliable, preventing abuse, responding to reports and maintaining the
        information needed to honor deletions. Where a law requires us to
        process or retain information, we rely on that legal obligation. Account
        details are needed for sign-in and account management. Photos, visit
        dates and public sharing are optional, and you can browse the public
        site without an account.
      </p>

      <h2 id="public-profile">What other people can see</h2>
      <p>
        New globes are private. If you publish your globe, anyone with its link
        can see your public name, profile address, saved places, photo galleries
        and captions, along with any profile photo you choose in Settings. You
        can upload a file or select{" "}
        <strong>Use Google photo on my globe</strong> to save a processed copy
        of your Google photo for this purpose. Your original Google photo link,
        email address and visit dates stay private. You can replace or remove
        the saved profile photo in Settings. GlobeAlbum removes original photo
        metadata from the versions it displays. You can make the globe private
        again in Studio. Previously issued image links can continue working for
        up to 60 seconds. People who already viewed your globe may have kept
        copies.
      </p>

      <h2>Who receives data</h2>
      <ul>
        <li>Vercel hosts the site and provides Web Analytics.</li>
        <li>Neon provides the database and account authentication.</li>
        <li>
          Cloudflare Workers and R2 handle private photo storage and delivery.
        </li>
        <li>
          Google handles optional Google sign-in and serves the account photo
          when available. Your browser connects to Google when displaying it in
          your signed-in account. GlobeAlbum requests the image from Google when
          you choose to save a copy as your profile photo.
        </li>
        <li>
          GeoNames receives the text of city searches. When you open the manual
          map, your browser requests map tiles from OpenStreetMap. The example
          globe loads demo photos from Unsplash. Direct browser requests can
          share connection details such as your IP address with those services.
        </li>
      </ul>
      <p>
        We may also disclose information where the law requires it. Providers
        may process data outside the European Economic Area. Where GDPR transfer
        rules apply, the applicable safeguards can include a European Commission
        adequacy decision or standard contractual clauses. Contact us for
        details about the safeguards for a particular transfer.
      </p>

      <h2>Cookies and browser storage</h2>
      <p>
        We use cookies to keep you signed in, verify sign-in requests and secure
        your session. Your light or dark theme selection is stored in your
        browser so it can be remembered. Vercel Web Analytics does not use
        cookies. The portfolio link contains a source tag so the destination can
        recognize traffic from GlobeAlbum. You can clear your browser storage to
        remove saved preferences and sign-in cookies.
      </p>

      <h2 id="account-deletion">Retention and account deletion</h2>
      <p>
        We retain your account and globe while you keep them. Original uploads
        are held temporarily for processing and cleanup. After processing, the
        album uses smaller display and thumbnail copies. The quarantine storage
        has a one-day expiry rule for leftover originals. For a saved profile
        photo, we store only the processed version and schedule its removal when
        you replace it, remove it or delete your account.
      </p>
      <p>
        Go to <Link href="/settings">Profile settings</Link>, choose{" "}
        <strong>Delete account</strong> and type your username to confirm. This
        removes access to the globe and schedules removal of its stored photos
        and sign-in identity. Photo links already issued can work until they
        expire. Storage and provider cleanup may take longer if an operation
        needs to be retried. Backup and operational copies, where present,
        expire under the applicable provider schedules.
      </p>
      <p>
        We currently retain a minimal deletion record and the retired profile
        address without a fixed expiry. They prevent an old session from
        reviving a deleted account and stop a retired address from being
        assigned to someone else. We keep support correspondence as needed to
        resolve the request and handle any related legal obligations or
        disputes.
      </p>

      <h2>Your rights and how to contact us</h2>
      <p>
        You can edit your profile and delete your account in Profile settings.
        You can request access to your data, a copy in a portable format,
        correction, erasure or restricted processing, or object to processing
        based on legitimate interests, where the right applies. Email{" "}
        <a href={operatorMailto}>{operatorEmail}</a> to make a request. We may
        need to verify your identity to protect your data.
      </p>
      <p>
        You can complain to your local supervisory authority or to the{" "}
        <a href="https://dataprotection.gov.sk/sk/dotknute-osoby/konanie-ochrane-osobnych-udajov/">
          Slovak Office for Personal Data Protection
        </a>
        .
      </p>
    </article>
  );
}
