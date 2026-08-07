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
      className={twMerge(clsx('block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between', className))}
      {...props}
    >
      <span>
        {children}
        {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </span>
    </label>
  );
};
