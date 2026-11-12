'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  LogIn,
} from 'lucide-react';

export function LoginView() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        router.push('/');
        router.refresh();
      } else {
        setErrorMessage(json.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 bg-slate-50/70 border-b border-slate-200/80 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-4">
            <Boxes className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            ระบบบันทึกและติดตามครุภัณฑ์
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้งานของคุณ (Admin / Staff)
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              ชื่อผู้ใช้ (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="เช่น admin หรือ staff"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="กรอกรหัสผ่าน..."
                className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 min-h-[46px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
