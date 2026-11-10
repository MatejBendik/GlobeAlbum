"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function redactPageUrl(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = "";
  url.hash = "";

  if (url.pathname.startsWith("/u/")) {
    url.pathname = "/u/[username]";
  }

  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={redactPageUrl} />;
}
