import './globals.css';

export const metadata = {
  title: 'Image → Video (9:16)',
  description: 'Stitch images into a 9:16 video, download video or GIF.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
