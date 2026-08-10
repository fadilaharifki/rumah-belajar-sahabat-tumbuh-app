'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, ShieldCheck, Sprout } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Modal } from '@/components/atoms/Modal';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if already running in PWA standalone mode
    const inStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(inStandaloneMode);

    if (inStandaloneMode) return;

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.error('Service worker registration failed:', err));
    }

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not dismissed, show banner
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (isIosDevice && !dismissed) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || !showBanner) return (
    <>
      <Modal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="Cara Pasang Aplikasi di HP"
        icon={Smartphone}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-amber-300">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Rumah Belajar Sahabat Tumbuh</h4>
              <p className="text-xs text-slate-500 font-medium">Bisa diinstall di HP tanpa perlu App Store / Play Store</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Pengguna Android (Google Chrome / Edge)</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside font-medium">
                <li>Klik ikon titik tiga (⋮) di pojok kanan atas browser.</li>
                <li>Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install App"</strong>.</li>
                <li>Konfirmasi pemasangan. Aplikasi akan langsung muncul di halaman depan HP Anda!</li>
              </ol>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-emerald-600" />
                <span>Pengguna iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside font-medium">
                <li>Buka web ini di browser <strong>Safari</strong>.</li>
                <li>Tekan tombol <strong>Bagikan / Share</strong> (ikon persegi berpanaah ke atas di bagian bawah).</li>
                <li>Gulir ke bawah dan pilih <strong className="text-emerald-700 font-bold">"Tambah ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600" />.</li>
                <li>Klik "Tambah" di pojok kanan atas. Selesai!</li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setShowGuideModal(false)} className="w-full font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1 text-amber-300" /> Saya Mengerti
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );

  return (
    <>
      {/* Floating Bottom PWA Installation Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-emerald-500 shadow-xl animate-in slide-in-from-bottom-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-amber-300 shrink-0 shadow-xs">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1">
                <span>Install Aplikasi HP</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">PWA</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                Pasang di layar utama HP agar mudah diakses seperti aplikasi Play Store!
              </p>
            </div>
          </div>

          <button
            onClick={handleDismissBanner}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 cursor-pointer"
            title="Tutup banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleInstallClick}
            className="w-full text-xs font-bold shadow-md h-8 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-amber-300" />
            <span>{deferredPrompt ? 'Install Aplikasi Sekarang' : 'Petunjuk Pasang di HP'}</span>
          </Button>

          <button
            onClick={() => setShowGuideModal(true)}
            className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-emerald-200 shrink-0 cursor-pointer"
          >
            Cara Pasang
          </button>
        </div>
      </div>

      <Modal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="Cara Pasang Aplikasi di HP"
        icon={Smartphone}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-amber-300">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Rumah Belajar Sahabat Tumbuh</h4>
              <p className="text-xs text-slate-500 font-medium">Bisa diinstall di HP tanpa perlu App Store / Play Store</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Pengguna Android (Google Chrome / Edge)</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside font-medium">
                <li>Klik ikon titik tiga (⋮) di pojok kanan atas browser.</li>
                <li>Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install App"</strong>.</li>
                <li>Konfirmasi pemasangan. Aplikasi akan langsung muncul di halaman depan HP Anda!</li>
              </ol>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-emerald-600" />
                <span>Pengguna iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside font-medium">
                <li>Buka web ini di browser <strong>Safari</strong>.</li>
                <li>Tekan tombol <strong>Bagikan / Share</strong> (ikon persegi berpanaah ke atas di bagian bawah).</li>
                <li>Gulir ke bawah dan pilih <strong className="text-emerald-700 font-bold">"Tambah ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600" />.</li>
                <li>Klik "Tambah" di pojok kanan atas. Selesai!</li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setShowGuideModal(false)} className="w-full font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1 text-amber-300" /> Saya Mengerti
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
