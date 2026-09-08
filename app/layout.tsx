import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '经络图谱 · Meridian Atlas',
  description: '可交互的三维经络与腧穴学习空间。',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/app-icon.svg' },
  appleWebApp: { capable: true, title: '经络图谱', statusBarStyle: 'default' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
