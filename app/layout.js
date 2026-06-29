import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: '纠结消消乐 · 把小纠结拆成小答案',
  description: '把今天的小纠结装进盲盒，拆出一个能落地的小答案。一个轻量的决策小玩具。',
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/icon.svg',
    apple: '/assets/icon.svg',
  },
  openGraph: {
    type: 'website',
    title: '纠结消消乐',
    description: '把今天的小纠结装进盲盒，拆出一个能落地的小答案。',
    images: ['/assets/og-cover.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '纠结消消乐',
    description: '把今天的小纠结装进盲盒，拆出一个能落地的小答案。',
    images: ['/assets/og-cover.svg'],
  },
};

export const viewport = {
  themeColor: '#cd6a3c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
