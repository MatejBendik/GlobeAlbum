import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>
        Made by{" "}
        <a href="https://www.matejbendik.com/?utm_source=globealbum&utm_medium=referral&utm_campaign=footer">
          Matej Bendík
        </a>
      </p>
      <nav aria-label="Legal and support">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/terms#report-content">Report content</Link>
      </nav>
    </footer>
  );
}
