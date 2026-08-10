"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { coffeeArt, type ArtKind } from "./fallback-art";

/**
 * Drop-in replacement for next/image used everywhere a photo may be
 * missing (bean bags, roaster logos, recipe covers, avatars, post media).
 * Falls back to a generated BeanMora coffee illustration instead of a
 * broken-image icon or an empty box — see fallback-art.tsx. Pass `artKind`
 * so the illustration suits the surface (a bag render for beans, a latte-art
 * cup for recipes, a badge for roasters, an equipment render for gear).
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackSeed,
  artKind,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
}: {
  src?: string | null;
  alt: string;
  fallbackSeed: string;
  artKind?: ArtKind;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coffeeArt(fallbackSeed, artKind)}
        alt={alt}
        className={cn("object-cover", fill ? "absolute inset-0 h-full w-full" : "", className)}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        className={cn("object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 400}
      height={height ?? 400}
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
