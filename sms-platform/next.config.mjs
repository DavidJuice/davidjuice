/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling server-only modules (Prisma 7, pg, etc.)
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "pg-native",
    "ioredis",
    "bullmq",
    "twilio",
    "xlsx",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
