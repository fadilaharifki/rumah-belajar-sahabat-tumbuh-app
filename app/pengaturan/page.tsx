'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Lock, Save, LogOut, Edit3, X,
  ShieldCheck, ChevronRight, ArrowLeft, Trash2, Globe, Key
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/stores/useToastStore';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { ImageUpload } from '@/components/molecules/ImageUpload';

export default function PengaturanPage() {
  const router = useRouter();
  const { user, activeRole, setAuthUser } = useAuthStore();
  const { signOut } = useAuth();

  // Active form view mode: 'none' | 'profile' | 'password'
  const [activeForm, setActiveForm] = useState<'none' | 'profile' | 'password'>('none');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.full_name || 'Pengguna');
  const [email, setEmail] = useState(user?.email || 'user@rbst.com');
  const [phone, setPhone] = useState('081122334455');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Password Form States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Submit Handler for Profile Data (Nama, Email, Phone, Avatar)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingPhoto || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_email: user?.email,
          full_name: fullName,
          email,
          phone,
          avatar_url: avatarUrl
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui profil');
      }

      if (user) {
        setAuthUser({
          ...user,
          full_name: fullName,
          email,
          avatar_url: avatarUrl
        });
      }

      toast.success(json.message || 'Data profil berhasil diperbarui!');
      setActiveForm('none');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler for Password Change Only
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!password) {
      toast.error('Kata sandi baru tidak boleh kosong!');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_email: user?.email,
          new_password: password
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui kata sandi');
      }

      toast.success(json.message || 'Kata sandi berhasil diperbarui!');
      setPassword('');
      setConfirmPassword('');
      setActiveForm('none');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui kata sandi!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.info('Anda telah keluar dari akun.');
    router.push('/login');
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sahabat_tumbuh_temp');
      toast.success('Cache & memori lokal aplikasi berhasil dibersihkan!');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24 sm:pb-8">
      {/* VIEW 1: MY PROFILE & SETTINGS MENU LIST */}
      {activeForm === 'none' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Profile Header Summary Card */}
          <Card className="p-6 bg-white border border-slate-200 shadow-2xs rounded-3xl text-center space-y-4">
            <div className="relative inline-block mx-auto">
              <Avatar
                src={avatarUrl}
                name={fullName}
                size="xl"
                className="w-24 h-24 ring-4 ring-emerald-500/30 shadow-md mx-auto"
              />
              <button
                onClick={() => setActiveForm('profile')}
                className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md border-2 border-white transition cursor-pointer"
                title="Ubah Foto Profil"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{fullName}</h2>
              <p className="text-xs text-slate-500 font-mono">{email}</p>
              <div className="pt-1.5 flex justify-center">
                <Badge variant="emerald" size="sm" className="font-extrabold uppercase text-[10px]">
                  {(activeRole || '').toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveForm('profile')}
                className="w-full sm:w-auto px-8 py-2.5 rounded-2xl shadow-md text-xs font-bold justify-center"
              >
                <Edit3 className="w-4 h-4 mr-2 text-amber-300" /> Edit Profile
              </Button>
            </div>
          </Card>

          {/* Menu Options Group Card */}
          <Card className="p-2 bg-white border border-slate-200 shadow-2xs rounded-3xl divide-y divide-slate-100">
            {/* Menu Item 1: Ubah Data Profil */}
            <button
              onClick={() => setActiveForm('profile')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition rounded-2xl cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition transform">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 text-sm block">Data Profil Saya</span>
                  <span className="text-[11px] text-slate-500 font-medium">Ubah foto, nama, email & nomor WhatsApp</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Menu Item 2: Keamanan & Kata Sandi */}
            <button
              onClick={() => setActiveForm('password')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition rounded-2xl cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition transform">
                  <Key className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 text-sm block">Ganti Kata Sandi</span>
                  <span className="text-[11px] text-slate-500 font-medium">Ubah password akun secara terpisah</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Menu Item 3: Status Peran & Hak Akses */}
            <div className="w-full p-3.5 flex items-center justify-between rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 text-sm block">Status Peran Sistem</span>
                  <span className="text-[11px] text-slate-500 font-medium">Akses perizinan aktif</span>
                </div>
              </div>
              <Badge variant="amber" size="sm" className="font-bold text-[10px]">
                {(activeRole || '').toUpperCase()}
              </Badge>
            </div>

            {/* Menu Item 4: Bahasa Sistem */}
            <div className="w-full p-3.5 flex items-center justify-between rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 text-sm block">Bahasa Aplikasi</span>
                  <span className="text-[11px] text-slate-500 font-medium">Bahasa Indonesia (Resmi)</span>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">ID</span>
            </div>

            {/* Menu Item 5: Bersihkan Cache */}
            <button
              onClick={handleClearCache}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition rounded-2xl cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition transform">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 text-sm block">Bersihkan Cache App</span>
                  <span className="text-[11px] text-slate-500 font-medium">Hapus penyimpanan sementara</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Menu Item 6: LOG OUT (At the very bottom in red styling) */}
            <button
              onClick={handleLogout}
              className="w-full p-3.5 flex items-center justify-between hover:bg-rose-50 transition rounded-2xl cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition transform">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-rose-600 text-sm block">Keluar Akun (Log out)</span>
                  <span className="text-[11px] text-rose-400 font-medium">Akhiri sesi login pengguna</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-0.5 transition" />
            </button>
          </Card>
        </div>
      )}

      {/* VIEW 2: KHUSUS FORM EDIT PROFIL (Data Diri) */}
      {activeForm === 'profile' && (
        <Card className="p-5 sm:p-7 space-y-5 bg-white border border-slate-200 shadow-sm rounded-3xl animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveForm('none')}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h3 className="font-bold text-slate-900 text-base">Edit Data Profil</h3>
            <div className="w-16" /> {/* Spacer */}
          </div>

          <div className="text-center">
            <ImageUpload
              currentImageUrl={avatarUrl}
              onImageUploaded={(url) => {
                setAvatarUrl(url);
                toast.success('Foto profil berhasil diperbarui!');
              }}
              onUploadingChange={setIsUploadingPhoto}
              folder="avatars"
            />
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <Label required>Nama Lengkap (Name):</Label>
              <Input
                required
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ibu Nurul"
                disabled={isUploadingPhoto || isSubmitting}
              />
            </div>

            <div>
              <Label required>Alamat Email (E-mail address):</Label>
              <Input
                required
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                disabled={isUploadingPhoto || isSubmitting}
              />
            </div>

            <div>
              <Label required>Nomor WhatsApp / HP (Phone number):</Label>
              <Input
                required
                type="number"
                icon={Phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081122334455"
                disabled={isUploadingPhoto || isSubmitting}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveForm('none')}
                disabled={isUploadingPhoto || isSubmitting}
                className="w-full justify-center text-xs font-bold py-2.5"
              >
                <X className="w-4 h-4 mr-1 text-slate-500" /> Batal
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isUploadingPhoto || isSubmitting}
                className="w-full justify-center text-xs font-bold shadow-md py-2.5"
              >
                <Save className="w-4 h-4 mr-1 text-amber-300" />
                <span>
                  {isUploadingPhoto
                    ? 'Unggah Foto...'
                    : isSubmitting
                    ? 'Menyimpan...'
                    : 'Simpan Profil'}
                </span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* VIEW 3: KHUSUS FORM GANTI KATA SANDI (Password Only) */}
      {activeForm === 'password' && (
        <Card className="p-5 sm:p-7 space-y-5 bg-white border border-slate-200 shadow-sm rounded-3xl animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveForm('none')}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h3 className="font-bold text-slate-900 text-base">Ganti Kata Sandi</h3>
            <div className="w-16" /> {/* Spacer */}
          </div>

          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Masukkan kata sandi baru untuk akun Supabase Anda.</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label required>Kata Sandi Baru (New Password):</Label>
              <Input
                required
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label required>Konfirmasi Kata Sandi Baru:</Label>
              <Input
                required
                type="password"
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                disabled={isSubmitting}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveForm('none')}
                disabled={isSubmitting}
                className="w-full justify-center text-xs font-bold py-2.5"
              >
                <X className="w-4 h-4 mr-1 text-slate-500" /> Batal
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !password}
                className="w-full justify-center text-xs font-bold shadow-md py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Save className="w-4 h-4 mr-1 text-amber-300" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Sandi Baru'}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
