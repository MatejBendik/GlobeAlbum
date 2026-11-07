import Link from "next/link";

export function AuthLegalNotice() {
  return (
    <p className="auth-legal-notice">
      By creating an account, you agree to the{" "}
      <Link href="/terms">Terms of Service</Link>. The{" "}
      <Link href="/privacy">Privacy Policy</Link> explains how we use your data.
    </p>
  );
}
