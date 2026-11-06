export function OAuthNotice({
  error,
  linking = false,
}: {
  error?: string | string[];
  linking?: boolean;
}) {
  if (typeof error !== "string" || !error) return null;
  let message: string;
  if (error === "account_not_linked")
    message =
      "An account with this email already exists. Sign in with email, then connect Google in Profile settings.";
  else if (error === "access_denied")
    message = "Google authorization was cancelled. You can try again.";
  else
    message = linking
      ? "Google could not be connected. Use the same email as your account and try again."
      : "Google sign-in could not be completed. Please try again.";
  return (
    <p
      role="alert"
      aria-label="Google authorization notice"
      className="oauth-notice"
    >
      {message}
    </p>
  );
}
