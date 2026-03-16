/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow long API responses for image generation
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
