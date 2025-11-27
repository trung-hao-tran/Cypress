/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gtvttwzhusrjwlietwyu.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
