import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'emerald',
  size = 'md',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    emerald: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    amber: 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold',
    blue: 'bg-sky-100 text-sky-800 border border-sky-200',
    rose: 'bg-rose-100 text-rose-800 border border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2'
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </span>
  );
};
