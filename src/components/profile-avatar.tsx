"use client";

import { useState } from "react";

export function ProfileAvatar({
  url,
  className,
  children,
}: {
  url: string | null;
  className: string;
  children: React.ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className={`profile-avatar ${className}`} aria-hidden="true">
      {children}
      {url && failedUrl !== url && (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
        />
      )}
    </span>
  );
}
