'use client';

import dynamic from 'next/dynamic';

const LoginView = dynamic(
  () => import('@/components/LoginView').then((m) => m.LoginView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">กำลังโหลดหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    ),
  }
);

export default function LoginPage() {
  return <LoginView />;
}
