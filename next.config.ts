import type { NextConfig } from "next";

function remotePatternsFromPublicUrl() {
  const publicUrl = process.env.STORAGE_S3_PUBLIC_URL;
  if (!publicUrl) return [];
  try {
    const { protocol, hostname } = new URL(publicUrl);
    return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remotePatternsFromPublicUrl(),
  },
};

export default nextConfig;
