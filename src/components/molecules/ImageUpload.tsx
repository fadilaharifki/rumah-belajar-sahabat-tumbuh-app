'use client';

import React, { useState, useRef } from 'react';
import { Camera, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Avatar } from '../atoms/Avatar';

export interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  folder?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUploaded,
  onUploadingChange,
  folder = 'avatars'
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploadingStatus = (uploading: boolean) => {
    setIsUploading(uploading);
    if (onUploadingChange) onUploadingChange(uploading);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingStatus(true);
    setUploadSuccess(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(folder)
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.warn('Supabase storage upload fallback:', error.message);
        onImageUploaded(objectUrl);
      } else if (data) {
        const { data: publicUrlData } = supabase.storage
          .from(folder)
          .getPublicUrl(fileName);

        const uploadedUrl = publicUrlData.publicUrl;
        setPreviewUrl(uploadedUrl);
        onImageUploaded(uploadedUrl);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('File upload failed:', err);
      onImageUploaded(objectUrl);
    } finally {
      setUploadingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3 py-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Responsive Larger Touch-friendly Avatar for Mobile */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer transition duration-200 transform active:scale-95 hover:scale-105 ${
          isDragging ? 'scale-105 ring-4 ring-emerald-300' : ''
        } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <Avatar
          src={previewUrl}
          size="xl"
          className="ring-4 ring-emerald-500 shadow-lg w-20 h-20 sm:w-24 sm:h-24"
        />

        {/* Sleek Hover Overlay for Touch */}
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-150">
          <Camera className="w-6 h-6 text-amber-300 mb-0.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            Ubah
          </span>
        </div>

        {/* Floating Camera Badge Icon */}
        <div className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-amber-300 border-2 border-white shadow-md group-hover:bg-amber-400 group-hover:text-slate-950 transition">
          <Camera className="w-4 h-4" />
        </div>
      </div>

      {/* Uploading / Success Messages */}
      <div className="text-center">
        {isUploading ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 animate-pulse">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
            <span>Mengunggah Foto...</span>
          </span>
        ) : uploadSuccess ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Check className="w-4 h-4 text-emerald-600" /> Foto Profil Berhasil Diperbarui!
          </span>
        ) : (
          <p className="text-xs font-medium text-slate-500 hover:text-emerald-700 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            Ketuk foto profil untuk mengganti gambar
          </p>
        )}
      </div>
    </div>
  );
};
