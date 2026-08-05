import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children?: React.ReactNode;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ children, className, required = false, ...props }) => {
  return (
    <label
      className={twMerge(clsx('block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider', className))}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );
};
