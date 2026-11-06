"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

function authErrorMessage(error: unknown) {
  const parsed = z
    .object({
      code: z.string().optional(),
      error: z.object({ code: z.string().optional() }).optional(),
    })
    .safeParse(error);
  const code = parsed.success
    ? parsed.data.error?.code || parsed.data.code
    : undefined;
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "invalid_credentials")
    return "Email or password is incorrect.";
  if (
    code === "USER_ALREADY_EXISTS" ||
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
    code === "user_already_exists"
  )
    return "An account with this email already exists. Try signing in.";
  if (code === "EMAIL_NOT_VERIFIED" || code === "email_not_confirmed")
    return "Verify your email before signing in.";
  return "Could not complete authentication. Please try again.";
}

export function EmailAuthForm({
  mode,
  enabled,
}: {
  mode: "sign-in" | "sign-up";
  enabled: boolean;
}) {
  const signup = mode === "sign-up";
  const schema = z.object({
    name: signup
      ? z.string().trim().min(1, "Enter your name.").max(60)
      : z.string(),
    email: z.email("Enter a valid email address.").max(254),
    password: z
      .string()
      .min(
        signup ? 8 : 1,
        signup ? "Use at least 8 characters." : "Enter your password.",
      )
      .max(128, "Use at most 128 characters."),
  });
  const [error, setError] = useState("");
  const [verification, setVerification] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      const result = signup
        ? await authClient.signUp.email(values)
        : await authClient.signIn.email({
            email: values.email,
            password: values.password,
          });
      if (result.error) {
        setError(authErrorMessage(result.error));
        return;
      }
      const session = await authClient.getSession();
      if (!session.data?.user) {
        setVerification(true);
        return;
      }
      // A full navigation reads the newly established server session.
      window.location.assign("/studio");
    } catch (error) {
      setError(authErrorMessage(error));
    }
  });
  return (
    <form
      onSubmit={submit}
      className="form-stack w-full max-w-sm text-left"
      noValidate
    >
      {signup && (
        <div className="field">
          <label htmlFor="auth-name">Name</label>
          <input
            id="auth-name"
            autoComplete="name"
            maxLength={60}
            {...register("name")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "auth-name-error" : undefined}
          />
          {errors.name && (
            <p id="auth-name-error" className="form-error">
              {errors.name.message}
            </p>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "auth-email-error" : undefined}
        />
        {errors.email && (
          <p id="auth-email-error" className="form-error">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          maxLength={128}
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "auth-password-error" : undefined}
        />
        {errors.password && (
          <p id="auth-password-error" className="form-error">
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {verification && (
        <p role="status">
          Check your email to verify your account, then sign in.
        </p>
      )}
      <Button type="submit" size="lg" disabled={!enabled || isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {signup ? "Create account" : "Sign in with email"}
      </Button>
    </form>
  );
}
