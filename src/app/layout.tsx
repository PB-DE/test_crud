import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร (Asset Tracking System)',
  description: 'ระบบบันทึกและติดตามตำแหน่งครุภัณฑ์ในองค์กร เชื่อมต่อฐานข้อมูล Google Sheets แบบเรียลไทม์',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
