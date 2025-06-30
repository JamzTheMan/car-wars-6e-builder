import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Enable serving static files from the /public directory
  images: {
    unoptimized: true, // Needed for static file serving in production
  },
  // Skip TypeScript checks during build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
