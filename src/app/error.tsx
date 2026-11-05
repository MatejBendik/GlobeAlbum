"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>We could not load this page.</h1>
      <p>Your connection or a service may be temporarily unavailable.</p>
      <div>
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
