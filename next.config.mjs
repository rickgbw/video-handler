/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg', 'sharp'],
};

export default nextConfig;
