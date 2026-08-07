import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name = '',
  size = 'md',
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const getCleanName = (str: string) => {
    if (!str) return 'User';
    return str.replace(/[._-]/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'User';
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base font-bold'
  };

  const rawName = name || alt || 'User';
  const displayName = getCleanName(rawName);

  // Modern DiceBear 10.x Initials SVG API fallback
  const dicebearFallback = `https://api.dicebear.com/10.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
  const avatarSrc = src && src.trim() && !imageError ? src : dicebearFallback;

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full font-bold shadow-xs shrink-0 ring-2 ring-emerald-500/20 bg-slate-100 select-none',
          sizes[size] || sizes.md,
          className
        )
      )}
      {...props}
    >
      <img
        src={avatarSrc}
        alt={alt || displayName}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};
