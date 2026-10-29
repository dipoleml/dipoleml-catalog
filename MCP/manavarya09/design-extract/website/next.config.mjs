/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle playwright — emit require('playwright-core') at runtime instead
      config.externals.push({
        'playwright': 'commonjs playwright-core',
      });
    }
    return config;
  },
  // Friendly badge URLs: /badge/stripe.com → /api/badge/stripe.com
  async rewrites() {
    return [
      { source: '/badge/:host', destination: '/api/badge/:host' },
      { source: '/badge/:host.svg', destination: '/api/badge/:host' },
    ];
  },
};

export default nextConfig;
