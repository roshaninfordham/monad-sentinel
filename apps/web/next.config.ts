import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@monad-sentinel/shared"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
