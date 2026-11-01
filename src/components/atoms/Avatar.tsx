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

  const getInitials = (str: string) => {
    const clean = getCleanName(str);
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Generate consistent pleasant background colors based on name hash
  const getBackgroundColor = (str: string) => {
    const colors = [
      'bg-emerald-600 text-white',
      'bg-indigo-600 text-white',
      'bg-violet-600 text-white',
      'bg-teal-600 text-white',
      'bg-amber-600 text-white',
      'bg-sky-600 text-white',
      'bg-rose-600 text-white',
      'bg-purple-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base font-bold'
  };

  const rawName = name || alt || 'User';
  const displayName = getCleanName(rawName);
  const initials = getInitials(rawName);
  const hasValidImage = Boolean(src && src.trim() && !imageError);

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full font-bold shadow-2xs shrink-0 select-none tracking-wider',
          sizes[size] || sizes.md,
          hasValidImage
            ? 'bg-slate-100 ring-2 ring-emerald-500/30'
            : `${getBackgroundColor(displayName)} ring-2 ring-emerald-500/40`,
          className
        )
      )}
      {...props}
    >
      {hasValidImage ? (
        <img
          src={src}
          alt={alt || displayName}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="flex items-center justify-center w-full h-full font-bold select-none leading-none">
          {initials}
        </span>
      )}
    </div>
  );
};
