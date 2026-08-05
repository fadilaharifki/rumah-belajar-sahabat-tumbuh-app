import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-200',
    secondary: 'bg-amber-500 hover:bg-amber-600 text-slate-900 focus:ring-amber-400 font-semibold shadow-amber-200',
    outline: 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-200',
    ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-none'
  };

  const sizes = {
    sm: 'h-9 px-4 text-xs font-bold gap-1.5',
    md: 'h-10 px-5 text-xs font-bold gap-2',
    lg: 'h-12 px-6 text-sm font-extrabold gap-2.5'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
