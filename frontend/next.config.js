/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to backend (same-origin pattern)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

