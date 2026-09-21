import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Baseline restrictions do not interfere with Next hydration, Supabase,
        // OAuth, or future barcode-camera access. Script nonces are a separate pass.
        { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
      ],
    }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{
      protocol: "https",
      hostname: "ubvzdglrwkkuaigmkjap.supabase.co",
      pathname: "/storage/v1/object/**",
    }],
  },
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default withNextIntl(nextConfig);
