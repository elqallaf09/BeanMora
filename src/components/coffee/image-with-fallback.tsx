"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { coffeeArt, type ArtKind } from "./fallback-art";
import { createClient } from "@/lib/supabase/client";
import { contentMediaPath, resolveContentMedia } from "@/lib/content-media";

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
  const project = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const protectedMedia = !!contentMediaPath(src, project);
  const [resolved, setResolved] = useState<{
    source: typeof src;
    url: string | null;
  }>({ source: null, url: null });
  useEffect(() => {
    setFailed(false);
    if (!protectedMedia) return;
    let active = true;
    const load = () =>
      void resolveContentMedia(createClient(), src, project)
        .then((url) => {
          if (active) setResolved({ source: src, url });
        })
        .catch(() => {
          if (active) setResolved({ source: src, url: null });
        });
    load();
    const timer = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [src, project, protectedMedia]);
  const imageSrc = protectedMedia
    ? resolved.source === src
      ? resolved.url
      : null
    : src;
  const showFallback = !imageSrc || failed;

  if (showFallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coffeeArt(fallbackSeed, artKind)}
        alt={alt}
        className={cn(
          "object-cover",
          fill ? "absolute inset-0 h-full w-full" : "",
          className,
        )}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={imageSrc!}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        unoptimized={protectedMedia}
        className={cn("object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={imageSrc!}
      alt={alt}
      width={width ?? 400}
      height={height ?? 400}
      sizes={sizes}
      priority={priority}
      unoptimized={protectedMedia}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
