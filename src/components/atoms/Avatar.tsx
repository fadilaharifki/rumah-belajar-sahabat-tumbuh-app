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

  const getInitials = (str: string) => {
    if (!str) return 'ST';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg font-bold'
  };

  // Modern UI-Avatars fallback SVG API with automatic rounded initials
  const displayName = name || alt || 'User';
  const uiAvatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=047857&color=FDE68A&bold=true&font-size=0.4`;

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full font-bold shadow-xs shrink-0 ring-2 ring-emerald-500/20 bg-slate-100',
          sizes[size] || sizes.md,
          className
        )
      )}
      {...props}
    >
      <img
        src={src && !imageError ? src : uiAvatarFallback}
        alt={alt || name}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};
