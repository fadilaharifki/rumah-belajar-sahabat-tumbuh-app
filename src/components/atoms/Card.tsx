import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const baseStyles = 'rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition duration-200';

  const variants = {
    default: 'hover:shadow-md',
    amber: 'bg-amber-50/50 border-amber-200/80 shadow-amber-100/50',
    emerald: 'bg-emerald-50/50 border-emerald-200/80 shadow-emerald-100/50',
    glass: 'bg-white/80 backdrop-blur-md border border-white/60 shadow-lg'
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variants[variant], className))}
      {...props}
    >
      {children}
    </div>
  );
};
