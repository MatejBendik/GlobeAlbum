import Link from "next/link";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("brand", dark && "brand-dark")}
      aria-label="GlobeAlbum home"
    >
      <span className="brand-symbol">
        <Globe2 size={22} strokeWidth={1.4} />
      </span>
      GlobeAlbum<span className="brand-dot">®</span>
    </Link>
  );
}
