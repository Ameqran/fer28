/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isGithubActions ? '/fer28' : '',
  assetPrefix: isGithubActions ? '/fer28/' : '',
};

export default nextConfig;
