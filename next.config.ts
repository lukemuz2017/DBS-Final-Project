import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // /dashboard on its own opens the default demo persona. ("/" is left alone:
  // on Vercel, vercel.json serves the class proposal there.)
  async redirects() {
    return [{ source: "/dashboard", destination: "/dashboard/freelance", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
