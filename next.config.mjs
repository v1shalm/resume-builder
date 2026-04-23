/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stub `canvas` (optional Node-only dep pulled in by pdfkit) so the client
  // bundle doesn't try to resolve it. Kept for both bundlers.
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./src/lib/empty-canvas.js" },
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
