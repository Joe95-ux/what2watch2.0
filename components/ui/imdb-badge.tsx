import Image from "next/image";
import { cn } from "@/lib/utils";

interface IMDBBadgeProps {
  className?: string;
  size?: number;
}

export function IMDBBadge({ className, size = 24 }: IMDBBadgeProps) {
  return (
    <Image
      src="/imdb-logo.png"
      alt="IMDb"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}

