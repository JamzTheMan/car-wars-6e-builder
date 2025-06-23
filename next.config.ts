import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Enable serving static files from the /public directory
  images: {
    unoptimized: true, // Needed for static file serving in production
  },
};

export default nextConfig;
