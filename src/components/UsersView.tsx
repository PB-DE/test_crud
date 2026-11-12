'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  ClipboardCheck,
  Loader2,
  X,
  Check,
  KeyRound,
} from 'lucide-react';
import { UserAccount, UserRole, SessionUser } from '@/lib/types';
import { formatLogDateTime } from '@/lib/ui-helpers';
import { Toast, ToastProps } from '@/components/Toast';

export function UsersView() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state for Add / Edit user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Omit<ToastProps, 'onDismiss'> | null>(null);

  const showToast = useCallback(
    (type: ToastProps['type'], message: string, title?: string) => {
      setToast({
        id: Math.random().toString(36).substring(2, 9),
        type,
        message,
        title,
      });
    },
    []
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) {
        router.push('/login');
        return;
      }
      const meJson = await meRes.json();
      if (!meJson.success || meJson.user?.role !== 'admin') {
        router.push('/');
        return;
      }
      setCurrentUser(meJson.user);

      const res = await fetch('/api/users');
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers(json.data || []);
      } else {
        showToast('error', json.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole('staff');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setUsername(user.username);
    setDisplayName(user.displayName);
    setPassword('');
    setRole(user.role);
    setActive(user.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingUser && (username.trim().length < 2 || /\s/.test(username.trim()))) {
      setFormError('ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษรและห้ามมีเว้นวรรค');
      return;
    }

    if (!displayName.trim()) {
      setFormError('กรุณาระบุชื่อ-นามสกุลผู้ใช้งาน (จะนำไปแสดงเป็นผู้บันทึก)');
      return;
    }

    if (!editingUser && password.length < 4) {
      setFormError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (editingUser && password.length > 0 && password.length < 4) {
      setFormError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const payload = editingUser
        ? {
            displayName: displayName.trim(),
            role,
            active,
            ...(password.length > 0 ? { password } : {}),
          }
        : {
            username: username.trim(),
            displayName: displayName.trim(),
            password,
            role,
            active,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setIsModalOpen(false);
        await fetchData();
        showToast(
          'success',
          editingUser
            ? `อัปเดตข้อมูลบัญชี "${displayName.trim()}" เรียบร้อยแล้ว`
            : `เพิ่มบัญชีผู้ใช้ "${username.trim()}" เรียบร้อยแล้ว`
        );
      } else {
        setFormError(json.error || 'บันทึกข้อมูลผู้ใช้งานไม่สำเร็จ');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.id === currentUser?.id) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchData();
        showToast('success', `ลบบัญชี "${user.displayName}" เรียบร้อยแล้ว`);
      } else {
        showToast('error', json.error || 'ไม่สามารถลบบัญชีได้');
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast {...toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-sm shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                จัดการผู้ใช้งานระบบ (Admin & Staff)
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                เพิ่ม แก้ไขสิทธิ์ รีเซ็ตรหัสผ่าน และกำหนดชื่อผู้บันทึกสำหรับแต่ละบัญชีใน Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all active:scale-[0.98] min-h-[42px]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>กลับหน้า Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer min-h-[42px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มผู้ใช้งาน</span>
            </button>
          </div>
        </header>

        {/* Users Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600 font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-5">ชื่อ-นามสกุล (ผู้บันทึก)</th>
                    <th className="py-3.5 px-5">ชื่อผู้ใช้ (Username)</th>
                    <th className="py-3.5 px-5">บทบาท (Role)</th>
                    <th className="py-3.5 px-5">สถานะบัญชี</th>
                    <th className="py-3.5 px-5">อัปเดตล่าสุด</th>
                    <th className="py-3.5 px-5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {u.displayName}
                          {isSelf && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              คุณ
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs text-slate-700">
                          {u.username}
                        </td>
                        <td className="py-3.5 px-5">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Shield className="w-3.5 h-3.5" />
                              Admin (ดูแลระบบ)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Staff (ตรวจเช็ก)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              ระงับใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatLogDateTime(u.updatedAt)}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              aria-label={`แก้ไข ${u.displayName}`}
                              title="แก้ไขข้อมูล / รีเซ็ตรหัสผ่าน"
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf || deletingId === u.id}
                              aria-label={`ลบ ${u.displayName}`}
                              title={isSelf ? 'ไม่สามารถลบบัญชีตนเองได้' : 'ลบบัญชีผู้ใช้'}
                              className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-w-[38px] min-h-[38px] flex items-center justify-center"
                            >
                              {deletingId === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <h2 id="user-modal-title" className="text-base font-bold text-slate-900">
                {editingUser ? `แก้ไขบัญชี: ${editingUser.username}` : 'เพิ่มผู้ใช้งานใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="user-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  ชื่อผู้ใช้ (Username) {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="user-username"
                  type="text"
                  disabled={Boolean(editingUser)}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น staff01 (ภาษาอังกฤษไม่มีเว้นวรรค)"
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                    editingUser
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                  } focus:outline-none`}
                />
              </div>

              <div>
                <label
                  htmlFor="user-displayName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  ชื่อ-นามสกุล (จะแสดงเป็นชื่อ &ldquo;ผู้บันทึก&rdquo;) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="user-displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    {editingUser ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)' : 'รหัสผ่าน'}
                  </span>{' '}
                  {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'กรอกเฉพาะเมื่อต้องการรีเซ็ตรหัสผ่าน' : 'อย่างน้อย 4 ตัวอักษร'}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="user-role"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    บทบาท (Role)
                  </label>
                  <select
                    id="user-role"
                    value={role}
                    disabled={editingUser?.id === currentUser?.id}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="staff">Staff (ตรวจเช็ก/อัปเดตสถานะ)</option>
                    <option value="admin">Admin (จัดการทั้งหมด)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="user-active"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    สถานะการใช้งาน
                  </label>
                  <select
                    id="user-active"
                    value={active ? 'true' : 'false'}
                    disabled={editingUser?.id === currentUser?.id}
                    onChange={(e) => setActive(e.target.value === 'true')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="true">เปิดใช้งาน</option>
                    <option value="false">ระงับชั่วคราว</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
