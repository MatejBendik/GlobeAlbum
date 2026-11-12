"use client";

export default function EmbedError({ reset }: { reset: () => void }) {
  return (
    <main className="embed-message">
      <h1>Could not load this globe.</h1>
      <p>Please try again in a moment.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
