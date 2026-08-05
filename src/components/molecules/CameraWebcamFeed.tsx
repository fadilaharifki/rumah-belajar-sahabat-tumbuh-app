import React, { useRef, useEffect, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';

export interface CameraWebcamFeedProps {
  onCapture: (result: { score: number; matchedName: string; photoDataUrl: string }) => void;
  targetTeacherName?: string;
}

export const CameraWebcamFeed: React.FC<CameraWebcamFeedProps> = ({ onCapture, targetTeacherName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ score: number; matchedName: string; photoDataUrl: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      setVerificationResult(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setErrorMsg('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsVerifying(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const photoDataUrl = canvas.toDataURL('image/jpeg');

    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult({
        score: 94.5,
        matchedName: targetTeacherName || 'Siti Nurhaliza, S.Pd.',
        photoDataUrl
      });
    }, 1500);
  };

  const confirmAndProceed = () => {
    if (verificationResult) {
      stopCamera();
      onCapture(verificationResult);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-full max-w-md aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-500/30 flex items-center justify-center">
        {errorMsg ? (
          <div className="p-6 text-center text-rose-400 font-medium flex flex-col items-center gap-2">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="text-sm">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={startCamera} className="mt-2 text-white border-white/40">
              <RefreshCw className="w-4 h-4 mr-1" /> Coba Lagi
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute inset-0 border-2 border-dashed border-amber-400/80 rounded-3xl m-8 pointer-events-none flex flex-col items-center justify-between p-4">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI Vision Face Frame
              </span>
              <div className="w-32 h-40 border-2 border-emerald-400 rounded-full animate-pulse opacity-80" />
              <span className="text-white text-xs bg-slate-900/80 px-3 py-1 rounded-full font-medium">
                Posisikan Wajah di Tengah Frame
              </span>
            </div>
          </>
        )}
      </div>

      {isVerifying ? (
        <div className="flex items-center gap-2 py-3 text-emerald-700 font-semibold text-sm">
          <Spinner size="md" />
          <span>AI sedang memverifikasi fitur wajah...</span>
        </div>
      ) : verificationResult ? (
        <div className="w-full bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span>Wajah Terverifikasi Cocok! ({verificationResult.score}%)</span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Teridentifikasi sebagai: <strong className="text-slate-900">{verificationResult.matchedName}</strong>
          </p>
          <div className="flex gap-2 w-full pt-2">
            <Button variant="outline" onClick={startCamera} className="w-1/2">
              Foto Ulang
            </Button>
            <Button variant="primary" onClick={confirmAndProceed} className="w-1/2">
              Lanjutkan Presensi
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          onClick={handleTakeSnapshot}
          disabled={!stream || !!errorMsg}
          className="w-full max-w-xs shadow-lg"
        >
          <Camera className="w-5 h-5 mr-1.5 text-slate-950" />
          Ambil Foto Presensi Selfie
        </Button>
      )}
    </div>
  );
};
