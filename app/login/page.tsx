'use client';

import React, { useState } from 'react';
import { Sprout, Sparkles, KeyRound, Mail, LogIn, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useLoginMutation } from '@/hooks/queries/useAuthQueries';
import { toast } from '@/stores/useToastStore';
import { Card } from '@/components/atoms/Card';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Button } from '@/components/atoms/Button';

export default function LoginPage() {
  const loginMutation = useLoginMutation();
  const showDemoPresets =
    process.env.NEXT_PUBLIC_SHOW_DEMO_PRESETS === 'true' ||
    process.env.NODE_ENV === 'development';

  const [email, setEmail] = useState(showDemoPresets ? 'pemilik@sahabattumbuh.id' : '');
  const [password, setPassword] = useState(showDemoPresets ? 'admin123' : '');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handlePresetSelect = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    toast.info(`Preset kredensial "${presetEmail}" dipilih`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-emerald-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-amber-300 shadow-xl shadow-emerald-200 mx-auto flex items-center justify-center">
            <Sprout className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            <span>Sahabat Tumbuh</span>
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
          </h1>
          <p className="text-xs font-semibold text-emerald-800 tracking-wide uppercase">
            Rumah Belajar & Pendampingan Intensif
          </p>
        </div>

        {/* Email & Password Login Form Card */}
        <Card variant="emerald" className="p-8 shadow-xl border-2 border-emerald-200 space-y-6 bg-white">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Masuk Akun Pengguna</h2>
            <p className="text-xs text-slate-500 font-medium">
              Masukkan email dan kata sandi akun Anda untuk mengakses sistem.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <Label required>Email / Username Akun:</Label>
              <Input
                type="email"
                required
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sahabattumbuh.id"
              />
            </div>

            <div>
              <Label required>Kata Sandi (Password):</Label>
              <Input
                type="password"
                required
                icon={KeyRound}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full font-semibold shadow-lg mt-2 justify-center py-3"
            >
              {loginMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memeriksa Akun...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-1 text-amber-300" /> Masuk ke Aplikasi
                </>
              )}
            </Button>
          </form>

          {/* DEMO PRESET BUTTONS (DEVELOPMENT ONLY / VIA ENV) - ADMIN ONLY */}
          {showDemoPresets && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-semibold uppercase">Pintasan Akun Dev</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('pemilik@sahabattumbuh.id', 'admin123')}
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 transition flex items-center justify-between text-xs font-semibold text-amber-950 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Admin / Pemilik</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">pemilik@sahabattumbuh.id</span>
                </button>
              </div>
            </>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <span>Rumah Belajar Sahabat Tumbuh © 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
