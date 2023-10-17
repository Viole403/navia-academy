import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Navia brand logo — theme-aware: dark mark on light surfaces (logo-on-light.svg),
 * light mark on dark surfaces (logo.svg). Swap driven by `data-mode` on <html>.
 */
export function Logo({ className, alt = "Navia" }: { className?: string; alt?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      <Image
        src="/logo-on-light.svg"
        alt={alt}
        width={512}
        height={512}
        loading="eager"
        className="h-full w-full [[data-mode=dark]_&]:hidden"
      />
      <Image
        src="/logo.svg"
        alt=""
        width={512}
        height={512}
        className="hidden h-full w-full [[data-mode=dark]_&]:block"
      />
    </span>
  );
}